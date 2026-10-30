import type { RegistroQrResultadoDto } from "@repo/api/client";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EscanearAsistencia } from "@/components/asistencia/escanear-asistencia";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  registrar: vi.fn(),
  leerUbicacion: vi.fn(),
  camara: { estado: "activa" },
  reintentar: vi.fn(),
  alDetectar: { actual: undefined as ((codigo: string) => void) | undefined },
}));

vi.mock("@/hooks/use-asistencias", () => ({
  useRegistrarAsistenciaQr: () => ({ mutateAsync: mocks.registrar }),
}));
vi.mock("@/lib/ubicacion", () => ({ leerUbicacion: mocks.leerUbicacion }));
vi.mock("@/components/asistencia/use-escaner-qr", () => ({
  useEscanerQr: (alDetectar: (codigo: string) => void) => {
    mocks.alDetectar.actual = alDetectar;
    return {
      videoRef: { current: null },
      estado: mocks.camara.estado,
      reintentar: mocks.reintentar,
    };
  },
}));

const ubicacion = { latitud: -26.8, longitud: -65.2, precisionMetros: 12 };
const registrada = (cambios: Partial<RegistroQrResultadoDto> = {}): RegistroQrResultadoDto => ({
  yaRegistrada: false,
  validacion: "UBICACION",
  turno: "NOCHE",
  aula: { id: "a1", codigo: "Aula 12", edificio: "A", piso: "1" },
  asistencia: {
    id: "s1",
    metodo: "QR",
    horaLlegada: "19:10",
    llegadaEn: "2026-10-21T22:10:00.000Z",
    motivo: null,
    docente: { id: "d1", nombre: "Marcos" },
    registradaPor: { id: "d1", nombre: "Marcos" },
  },
  ...cambios,
});
const escanear = (codigo = "token") =>
  act(async () => {
    mocks.alDetectar.actual?.(codigo);
    await Promise.resolve();
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.camara.estado = "activa";
  mocks.leerUbicacion.mockResolvedValue(ubicacion);
});

describe("EscanearAsistencia", () => {
  it("abre la cámara directamente con la invitación a escanear", () => {
    renderWithProviders(<EscanearAsistencia />);
    expect(screen.getByText("Escaneá el QR del aula")).toBeInTheDocument();
    expect(mocks.registrar).not.toHaveBeenCalled();
  });

  it("al leer el código envía el token con la ubicación y muestra la tarjeta de asistencia", async () => {
    mocks.registrar.mockResolvedValue(registrada());
    renderWithProviders(<EscanearAsistencia />);

    await escanear("abc.def");

    expect(mocks.registrar).toHaveBeenCalledWith({ token: "abc.def", ubicacion });
    expect(screen.getByText("Asistencia registrada")).toBeInTheDocument();
    expect(screen.getByText("Aula 12 · Turno Noche · 19:10")).toBeInTheDocument();
    expect(screen.queryByText("Escaneá el QR del aula")).not.toBeInTheDocument();
  });

  it("sin ubicación igual envía el código para validar por la red institucional", async () => {
    mocks.leerUbicacion.mockResolvedValue(undefined);
    mocks.registrar.mockResolvedValue(registrada({ validacion: "RED" }));
    renderWithProviders(<EscanearAsistencia />);

    await escanear();

    expect(mocks.registrar).toHaveBeenCalledWith({ token: "token", ubicacion: undefined });
  });

  it("una clase ya registrada muestra el registro existente sin duplicar", async () => {
    const base = registrada();
    mocks.registrar.mockResolvedValue(
      registrada({
        yaRegistrada: true,
        validacion: null,
        asistencia: { ...base.asistencia, metodo: "MANUAL", horaLlegada: "19:02" },
      }),
    );
    renderWithProviders(<EscanearAsistencia />);

    await escanear();

    expect(screen.getByText("La asistencia ya estaba registrada")).toBeInTheDocument();
    expect(screen.getByText(/Registro manual a las 19:02/)).toBeInTheDocument();
  });

  it("un error ofrece Volver a escanear, que reabre la lectura", async () => {
    mocks.registrar.mockRejectedValue(
      new RequestError(422, "VALIDATION", "El código QR no es válido o ya venció."),
    );
    renderWithProviders(<EscanearAsistencia />);

    await escanear();

    expect(screen.getByText("El código QR no es válido o ya venció.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver a escanear" }));
    expect(screen.queryByText("No se registró la asistencia")).not.toBeInTheDocument();
    expect(screen.getByText("Escaneá el QR del aula")).toBeInTheDocument();
  });

  it("un error inesperado también permite volver a escanear", async () => {
    mocks.registrar.mockRejectedValue(new Error("red caída"));
    renderWithProviders(<EscanearAsistencia />);

    await escanear();

    expect(screen.getByText(/No pudimos validar el código/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver a escanear" })).toBeInTheDocument();
  });

  it("el bloqueo por intentos avisa a qué hora se libera y no ofrece volver a escanear", async () => {
    mocks.registrar.mockRejectedValue(
      new RequestError(
        429,
        "ATTEMPTS_BLOCKED",
        "Superaste los 10 intentos fallidos. No podés volver a escanear hasta que pasen 15 minutos: se libera a las 19:24.",
      ),
    );
    renderWithProviders(<EscanearAsistencia />);

    await escanear();

    expect(
      screen.getByText(/hasta que pasen 15 minutos: se libera a las 19:24/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Volver a escanear" })).not.toBeInTheDocument();
    expect(screen.queryByText("Escaneá el QR del aula")).not.toBeInTheDocument();
  });

  it("con la cámara denegada explica cómo habilitarla, sin estilo de error, y reintenta sin recargar", async () => {
    mocks.camara.estado = "denegada";
    renderWithProviders(<EscanearAsistencia />);

    expect(screen.getByText("La cámara está bloqueada")).toBeInTheDocument();
    expect(screen.getByText(/Cámara > Permitir/)).toBeInTheDocument();
    expect(
      screen.getByText(/pedile al bedel que registre tu asistencia a mano/),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).not.toHaveAttribute(
      "class",
      expect.stringContaining("destructive"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
    expect(mocks.reintentar).toHaveBeenCalledTimes(1);
  });

  it("sin cámara disponible guía a escanear desde el celular y ofrece reintentar", async () => {
    mocks.camara.estado = "no-disponible";
    renderWithProviders(<EscanearAsistencia />);

    expect(screen.getByText("Escaneá el QR desde tu celular")).toBeInTheDocument();
    expect(screen.getByText(/abrí SiGA en tu teléfono y entrá a Asistencia/)).toBeInTheDocument();
    expect(
      screen.getByText(/pedile al bedel que registre tu asistencia a mano/),
    ).toBeInTheDocument();
    expect(screen.queryByText("No pudimos abrir la cámara")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
    expect(mocks.reintentar).toHaveBeenCalledTimes(1);
  });
});
