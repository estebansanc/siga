import type { AulaDto, ClaseDto, PlanoAulaDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanoAcciones } from "@/components/aulas/plano-acciones";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  asignables: [] as ClaseDto[],
  destinos: [] as AulaDto[],
}));
const asignar = vi.hoisted(() => vi.fn());
const mover = vi.hoisted(() => vi.fn());
const reemplazar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-aulas", () => ({
  useClasesAsignables: () => ({ data: { clases: state.asignables } }),
  useAulasDestino: () => ({ data: state.destinos }),
  useMoverClase: () => ({ mutateAsync: mover }),
  useReemplazarClase: () => ({ mutateAsync: reemplazar }),
}));
vi.mock("@/hooks/use-solicitudes-aula", () => ({
  useAsignarAulaAClase: () => ({ mutateAsync: asignar }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clase = (id: string, comision: string): ClaseDto =>
  ({
    id,
    horaInicio: "19:00",
    horaFin: "21:00",
    comision: { id: `co-${id}`, codigo: comision, turno: "NOCHE" },
    materia: { nombre: "Proyecto Final" },
  }) as ClaseDto;

const destino = (id: string, codigo: string, piso: string): AulaDto => ({
  id,
  codigo,
  edificio: "Edificio A",
  piso,
  capacidad: 40,
  equipamiento: [],
});

const aula = (parcial: Partial<PlanoAulaDto> = {}): PlanoAulaDto => ({
  id: "a1",
  codigo: "Aula 1",
  edificio: "Edificio A",
  piso: "PB",
  capacidad: 30,
  estadoAula: "DISPONIBLE",
  estado: "LIBRE",
  plano: null,
  poligono: null,
  claseEnCurso: null,
  proximaClase: null,
  ...parcial,
});

const conClase = aula({ estado: "PENDIENTE", claseEnCurso: clase("c-actual", "5K2") });

beforeEach(() => {
  vi.clearAllMocks();
  state.asignables = [clase("c1", "5K1")];
  state.destinos = [destino("a2", "Aula 2", "PB"), destino("a9", "Aula 9", "2.º piso")];
});

describe("PlanoAcciones", () => {
  it("el Bedel y la Autoridad ven Asignar en un aula libre", () => {
    for (const perfil of ["BEDEL", "AUTORIDAD"] as const) {
      const { unmount } = renderWithProviders(<PlanoAcciones aula={aula()} perfil={perfil} />);
      expect(screen.getByRole("button", { name: "Asignar clase" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Mover a otra aula" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("en un aula con clase ofrecen Mover y Reemplazar", () => {
    renderWithProviders(<PlanoAcciones aula={conClase} perfil="BEDEL" />);
    expect(screen.getByRole("button", { name: "Mover a otra aula" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reemplazar clase" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Asignar clase" })).not.toBeInTheDocument();
  });

  it("Docente y Estudiante no ven acciones", () => {
    for (const perfil of ["DOCENTE", "ESTUDIANTE"] as const) {
      const { container, unmount } = renderWithProviders(
        <PlanoAcciones aula={conClase} perfil={perfil} />,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("Asignar manda la clase elegida al aula", async () => {
    asignar.mockResolvedValue(undefined);
    renderWithProviders(<PlanoAcciones aula={aula()} perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Asignar clase" }));

    const dialog = await screen.findByRole("dialog", { name: "Asignar clase" });
    expect(within(dialog).getByRole("button", { name: "Asignar" })).toBeDisabled();
    await userEvent.selectOptions(within(dialog).getByLabelText("Clase"), "c1");
    await userEvent.click(within(dialog).getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(asignar).toHaveBeenCalledWith({ id: "c1", aulaId: "a1" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Asignar sin clases candidatas lo dice", async () => {
    state.asignables = [];
    renderWithProviders(<PlanoAcciones aula={aula()} perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Asignar clase" }));
    const dialog = await screen.findByRole("dialog", { name: "Asignar clase" });
    expect(within(dialog).getByText("No hay clases de hoy para asignar")).toBeVisible();
  });

  it("Mover agrupa las aulas por piso y mueve la clase en curso", async () => {
    mover.mockResolvedValue(undefined);
    renderWithProviders(<PlanoAcciones aula={conClase} perfil="AUTORIDAD" />);
    await userEvent.click(screen.getByRole("button", { name: "Mover a otra aula" }));

    const dialog = await screen.findByRole("dialog", { name: "Mover a otra aula" });
    expect(within(dialog).getByRole("group", { name: "Edificio A, PB" })).toBeVisible();
    expect(within(dialog).getByRole("group", { name: "Edificio A, 2.º piso" })).toBeVisible();
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula de destino"), "a9");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mover" }));

    await waitFor(() => expect(mover).toHaveBeenCalledWith({ claseId: "c-actual", aulaId: "a9" }));
  });

  it("Reemplazar exige elegir la clase que entra y el aula de la actual", async () => {
    reemplazar.mockResolvedValue(undefined);
    renderWithProviders(<PlanoAcciones aula={conClase} perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Reemplazar clase" }));

    const dialog = await screen.findByRole("dialog", { name: "Reemplazar clase" });
    const confirmar = within(dialog).getByRole("button", { name: "Reemplazar" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Clase que entra"), "c1");
    expect(confirmar).toBeDisabled();
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula para la clase actual"), "a2");
    await userEvent.click(confirmar);

    await waitFor(() =>
      expect(reemplazar).toHaveBeenCalledWith({ claseId: "c1", aulaDestinoId: "a2" }),
    );
  });

  it("si el aula se ocupó muestra la comisión en el diálogo y no lo cierra", async () => {
    const mensaje = "El aula ya está asignada en esa franja: la ocupa la comisión 5K9";
    mover.mockRejectedValue(new RequestError(409, "CONFLICT", mensaje));
    renderWithProviders(<PlanoAcciones aula={conClase} perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Mover a otra aula" }));
    const dialog = await screen.findByRole("dialog", { name: "Mover a otra aula" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula de destino"), "a2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mover" }));

    expect(await within(dialog).findByText(mensaje)).toBeVisible();
    expect(dialog).toBeVisible();
  });
});
