import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EscanearAsistencia } from "@/components/asistencia/escanear-asistencia";
import { renderWithProviders } from "@/test/render";

vi.mock("@/hooks/use-asistencias", () => ({
  useRegistrarAsistenciaQr: () => ({ mutateAsync: vi.fn() }),
}));

const getUserMedia = vi.fn();

class DetectorFalso {
  detect = vi.fn().mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("BarcodeDetector", DetectorFalso);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
});

afterEach(() => vi.unstubAllGlobals());

describe("EscanearAsistencia con la cámara real del hook", () => {
  it("falla la cámara, se reintenta sin recargar y llega al escáner", async () => {
    getUserMedia
      .mockRejectedValueOnce(new DOMException("sin cámara", "NotFoundError"))
      .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    renderWithProviders(<EscanearAsistencia />);

    expect(await screen.findByText("Escaneá el QR desde tu celular")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));

    await waitFor(() =>
      expect(screen.queryByText("Escaneá el QR desde tu celular")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Escaneá el QR del aula")).toBeVisible();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("si al reintentar sigue sin cámara vuelve el mismo estado informativo", async () => {
    getUserMedia.mockRejectedValue(new DOMException("sin cámara", "NotFoundError"));
    renderWithProviders(<EscanearAsistencia />);

    await userEvent.click(await screen.findByRole("button", { name: "Volver a intentar" }));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Escaneá el QR desde tu celular")).toBeInTheDocument();
  });

  it("al reintentar muestra Abriendo la cámara… mientras la cámara tarda en abrir", async () => {
    getUserMedia
      .mockRejectedValueOnce(new DOMException("sin cámara", "NotFoundError"))
      .mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<EscanearAsistencia />);

    await userEvent.click(await screen.findByRole("button", { name: "Volver a intentar" }));

    expect(await screen.findByText("Abriendo la cámara…")).toBeInTheDocument();
    expect(screen.queryByText("Escaneá el QR desde tu celular")).not.toBeInTheDocument();
  });
});
