import type { ClaseDto, SesionQrDto } from "@repo/api/client";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QrEnVivo } from "@/components/qr/qr-en-vivo";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const generar = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ clases: [] as ClaseDto[] }));

vi.mock("@/hooks/use-qr", () => ({
  useGenerarQr: () => ({ mutateAsync: generar }),
  useClasesDelTurno: () => ({ data: state.clases }),
}));

const consulta = { aulaId: "a1", turno: "NOCHE" as const, fecha: "2026-10-26" };

const sesion = (numero: number, overrides: Partial<SesionQrDto> = {}): SesionQrDto => ({
  id: `s${numero}`,
  token: `token-${numero}`,
  aula: { id: "a1", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" },
  fecha: "2026-10-26",
  turno: "NOCHE",
  turnoInicio: "2026-10-26T21:00:00.000Z",
  turnoFin: "2026-10-27T02:30:00.000Z",
  emitidoEn: "2026-10-26T22:00:00.000Z",
  venceEn: "2026-10-26T22:01:00.000Z",
  ...overrides,
});

const clase = {
  id: "c1",
  horaInicio: "19:00",
  horaFin: "23:00",
  materia: { nombre: "Proyecto Final" },
  comision: { codigo: "5K2" },
  docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
} as ClaseDto;

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  state.clases = [clase];
});

afterEach(() => vi.useRealTimers());

describe("QrEnVivo", () => {
  it("muestra el QR con aula, turno y cuenta, y las clases del turno al lado", async () => {
    generar.mockResolvedValue(sesion(1));
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(10);

    expect(screen.getByTitle("QR de asistencia de Aula 12")).toBeInTheDocument();
    expect(screen.getByText("Aula 12")).toBeInTheDocument();
    expect(screen.getByText("Turno Noche")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("Cambia en 60 s");
    expect(screen.getByText("Proyecto Final")).toBeInTheDocument();
    expect(screen.getByText("5K2")).toBeInTheDocument();
    expect(screen.getByText(/19:00 – 23:00 · Marcos Álvarez/)).toBeInTheDocument();
  });

  it("cuenta hacia atrás y, al llegar a 0, pide otro código y reinicia la cuenta", async () => {
    generar
      .mockResolvedValueOnce(sesion(1))
      .mockResolvedValueOnce(
        sesion(2, { emitidoEn: "2026-10-26T22:01:00.000Z", venceEn: "2026-10-26T22:02:00.000Z" }),
      );
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(10);

    await avanzar(10_000);
    expect(screen.getByRole("timer")).toHaveTextContent("Cambia en 50 s");
    expect(generar).toHaveBeenCalledTimes(1);

    await avanzar(50_500);
    expect(generar).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("timer")).toHaveTextContent("Cambia en 60 s");
  });

  it("si la renovación falla oculta el QR y muestra el motivo", async () => {
    generar
      .mockResolvedValueOnce(sesion(1))
      .mockRejectedValueOnce(
        new RequestError(
          422,
          "VALIDATION",
          "La institución está cerrada: no se puede generar el QR",
        ),
      );
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(60_500);

    expect(screen.queryByTitle("QR de asistencia de Aula 12")).not.toBeInTheDocument();
    expect(screen.getByText("No se pudo generar el QR")).toBeInTheDocument();
    expect(screen.getByText(/institución está cerrada/)).toBeInTheDocument();
  });

  it("el primer pedido rechazado muestra el error sin QR", async () => {
    generar.mockRejectedValue(
      new RequestError(422, "VALIDATION", "El aula no tiene clases en ese turno"),
    );
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(10);

    expect(screen.getByText("El aula no tiene clases en ese turno")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("un código que vence con el turno no se renueva y avisa que el turno terminó", async () => {
    generar.mockResolvedValue(
      sesion(1, {
        emitidoEn: "2026-10-27T02:29:40.000Z",
        venceEn: "2026-10-27T02:30:00.000Z",
      }),
    );
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(10);
    await avanzar(20_500);

    expect(screen.queryByTitle("QR de asistencia de Aula 12")).not.toBeInTheDocument();
    expect(screen.getByText("El turno terminó")).toBeInTheDocument();
    expect(generar).toHaveBeenCalledTimes(1);
  });

  it("pantalla completa muestra el QR grande con aula, turno y cuenta", async () => {
    generar.mockResolvedValue(sesion(1));
    renderWithProviders(<QrEnVivo consulta={consulta} />);
    await avanzar(10);

    vi.useRealTimers();
    await userEvent.click(screen.getByRole("button", { name: "Pantalla completa" }));
    const dialog = await screen.findByRole("dialog", { name: /pantalla completa/i });
    expect(dialog).toHaveTextContent("Aula 12");
    expect(dialog).toHaveTextContent("Turno Noche");
    expect(dialog).toHaveTextContent(/Cambia en \d+ s/);
  });
});
