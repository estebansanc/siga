import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEscanerQr } from "@/components/asistencia/use-escaner-qr";

const pista = { stop: vi.fn() };
const getUserMedia = vi.fn();
const detect = vi.fn();

class DetectorFalso {
  detect = detect;
}

const conVideo = (hook: ReturnType<typeof useEscanerQr>) => {
  const video = document.createElement("video");
  Object.defineProperty(video, "readyState", { value: 4 });
  video.play = vi.fn().mockResolvedValue(undefined);
  hook.videoRef.current = video;
  return video;
};

beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia.mockResolvedValue({ getTracks: () => [pista] });
  vi.stubGlobal("BarcodeDetector", DetectorFalso);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
});

afterEach(() => vi.unstubAllGlobals());

describe("useEscanerQr", () => {
  it("pide la cámara trasera y avisa el código leído", async () => {
    detect.mockResolvedValue([{ rawValue: "token-firmado" }]);
    const alDetectar = vi.fn();
    const { result } = renderHook(() => {
      const escaner = useEscanerQr(alDetectar, false);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });

    await waitFor(() => expect(result.current.estado).toBe("activa"));
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: "environment" } } });
    await waitFor(() => expect(alDetectar).toHaveBeenCalledWith("token-firmado"));
  });

  it("pausado no lee códigos", async () => {
    detect.mockResolvedValue([{ rawValue: "token" }]);
    const alDetectar = vi.fn();
    const { result } = renderHook(() => {
      const escaner = useEscanerQr(alDetectar, true);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });

    await waitFor(() => expect(result.current.estado).toBe("activa"));
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(alDetectar).not.toHaveBeenCalled();
  });

  it("con el permiso denegado informa la cámara denegada", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denegado", "NotAllowedError"));
    const { result } = renderHook(() => useEscanerQr(vi.fn(), false));
    await waitFor(() => expect(result.current.estado).toBe("denegada"));
  });

  it("sin cámara o con otro error informa que no está disponible", async () => {
    getUserMedia.mockRejectedValue(new DOMException("sin cámara", "NotFoundError"));
    const { result } = renderHook(() => useEscanerQr(vi.fn(), false));
    await waitFor(() => expect(result.current.estado).toBe("no-disponible"));
  });

  it("si el detector falla al leer informa que no está disponible", async () => {
    detect.mockRejectedValue(new Error("wasm"));
    const { result } = renderHook(() => {
      const escaner = useEscanerQr(vi.fn(), false);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });
    await waitFor(() => expect(result.current.estado).toBe("no-disponible"), { timeout: 3000 });
  });

  it("si el detector no se puede crear informa que no está disponible", async () => {
    vi.stubGlobal(
      "BarcodeDetector",
      class {
        constructor() {
          throw new Error("sin soporte");
        }
      },
    );
    const { result } = renderHook(() => {
      const escaner = useEscanerQr(vi.fn(), false);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });
    await waitFor(() => expect(result.current.estado).toBe("no-disponible"));
  });

  it("al desmontar apaga la cámara", async () => {
    const { result, unmount } = renderHook(() => {
      const escaner = useEscanerQr(vi.fn(), false);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });
    await waitFor(() => expect(result.current.estado).toBe("activa"));
    unmount();
    expect(pista.stop).toHaveBeenCalled();
  });

  it("reintentar vuelve a pedir la cámara y pasa a activa si ahora abre", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("sin cámara", "NotFoundError"));
    const { result } = renderHook(() => {
      const escaner = useEscanerQr(vi.fn(), false);
      if (!escaner.videoRef.current) conVideo(escaner);
      return escaner;
    });
    await waitFor(() => expect(result.current.estado).toBe("no-disponible"));

    act(() => result.current.reintentar());
    expect(result.current.estado).toBe("iniciando");
    await waitFor(() => expect(result.current.estado).toBe("activa"));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("reintentar con el permiso aún denegado vuelve a informar la cámara denegada", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denegado", "NotAllowedError"));
    const { result } = renderHook(() => useEscanerQr(vi.fn(), false));
    await waitFor(() => expect(result.current.estado).toBe("denegada"));

    act(() => result.current.reintentar());
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.estado).toBe("denegada"));
  });
});
