import type { ClaseDto } from "@repo/api/client";
import { fechaArgentina } from "@repo/domain";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RegistroManualDialog } from "@/components/qr/registro-manual-dialog";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const registrar = vi.fn();
let clases: ClaseDto[] = [];

vi.mock("@/hooks/use-clases", () => ({
  useClases: () => ({ data: { fecha: "hoy", clases } }),
}));
vi.mock("@/hooks/use-asistencias", () => ({
  useRegistrarAsistenciaManual: () => ({ mutateAsync: registrar, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const enUnaHora = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const unaClase = (cambios: Partial<ClaseDto>): ClaseDto => ({
  id: "clase-1",
  fecha: fechaArgentina(new Date()),
  horaInicio: "19:00",
  horaFin: "23:00",
  inicio: new Date().toISOString(),
  fin: enUnaHora(),
  estado: "PROGRAMADA",
  modalidad: "PRESENCIAL",
  comision: { id: "c1", codigo: "5K2", turno: "NOCHE" },
  materia: { id: "m1", codigo: "K5-PF", nombre: "Proyecto Final", anioCarrera: 5, carreraId: "k" },
  carrera: { id: "k", codigo: "K", nombre: "ISI" },
  aula: { id: "a1", codigo: "Aula 12", edificio: "A", piso: "1" },
  docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
  novedades: [],
  asistencia: null,
  ...cambios,
});

const abrir = () => renderWithProviders(<RegistroManualDialog onClose={vi.fn()} />);

afterEach(() => vi.useRealTimers());

beforeEach(() => {
  vi.clearAllMocks();
  clases = [unaClase({})];
});

describe("RegistroManualDialog", () => {
  it("lista solo las clases Programadas o Demoradas que no terminaron", () => {
    clases = [
      unaClase({}),
      unaClase({
        id: "c2",
        estado: "DEMORADA",
        comision: { id: "c2", codigo: "5K1", turno: "NOCHE" },
      }),
      unaClase({ id: "c3", estado: "DOCENTE_PRESENTE" }),
      unaClase({ id: "c4", estado: "FINALIZADA" }),
      unaClase({ id: "c5", fin: new Date(Date.now() - 1000).toISOString() }),
    ];
    abrir();
    expect(
      screen.getByRole("option", { name: "Proyecto Final 5K2 · 19:00–23:00 · Aula 12" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Proyecto Final 5K1/ })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: /Proyecto Final/ })).toHaveLength(2);
  });

  it("avisa cuando no hay clases pendientes", () => {
    clases = [];
    abrir();
    expect(screen.getByText("No hay clases de hoy pendientes de asistencia")).toBeVisible();
  });

  it("preselecciona al docente único de la comisión", async () => {
    abrir();
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    expect(screen.getByLabelText("Docente")).toHaveValue("d1");
  });

  it("deja elegir cuando la comisión tiene más de un docente", async () => {
    clases = [
      unaClase({
        docentes: [
          { id: "d1", nombre: "Marcos Álvarez" },
          { id: "d2", nombre: "Ana Pérez" },
        ],
      }),
    ];
    abrir();
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    expect(screen.getByLabelText("Docente")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Registrar asistencia" }));
    expect(await screen.findByText("Elegí el docente")).toBeVisible();
  });

  it("muestra los errores junto a cada campo y no registra", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Registrar asistencia" }));
    expect(await screen.findByText("Elegí la clase")).toBeVisible();
    expect(screen.getByText("Ingresá el motivo del registro manual.")).toBeVisible();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("rechaza una hora futura y un motivo de más de 500 caracteres", async () => {
    clases = [unaClase({ fin: "2026-10-27T02:00:00Z" })];
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    abrir();
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    fireEvent.change(screen.getByLabelText("Hora de llegada"), { target: { value: "12:01" } });
    await userEvent.click(screen.getByLabelText("Motivo"));
    await userEvent.paste("a".repeat(501));
    expect(screen.getByText("501 / 500")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Registrar asistencia" }));
    expect(await screen.findByText("El motivo puede tener hasta 500 caracteres.")).toBeVisible();
    expect(
      screen.getByText("La hora de llegada no puede ser posterior a la hora actual."),
    ).toBeVisible();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("registra, avisa y cierra", async () => {
    const onClose = vi.fn();
    registrar.mockResolvedValue({});
    renderWithProviders(<RegistroManualDialog onClose={onClose} />);
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    fireEvent.change(screen.getByLabelText("Hora de llegada"), { target: { value: "00:00" } });
    await userEvent.type(screen.getByLabelText("Motivo"), "Teléfono sin batería");
    await userEvent.click(screen.getByRole("button", { name: "Registrar asistencia" }));
    await waitFor(() =>
      expect(registrar).toHaveBeenCalledWith({
        claseId: "clase-1",
        docenteId: "d1",
        horaLlegada: "00:00",
        motivo: "Teléfono sin batería",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Asistencia registrada. La clase quedó en Docente presente.",
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("muestra el error de una clase que ya tiene asistencia y sigue abierto", async () => {
    const onClose = vi.fn();
    const mensaje = "Esta clase ya tiene asistencia registrada: Registro manual a las 19:05.";
    registrar.mockRejectedValue(new RequestError(409, "CONFLICT", mensaje));
    renderWithProviders(<RegistroManualDialog onClose={onClose} />);
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    fireEvent.change(screen.getByLabelText("Hora de llegada"), { target: { value: "00:00" } });
    await userEvent.type(screen.getByLabelText("Motivo"), "Sin batería");
    await userEvent.click(screen.getByRole("button", { name: "Registrar asistencia" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(mensaje));
    expect(onClose).not.toHaveBeenCalled();
  });
});
