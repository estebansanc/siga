import type { AulaDetalleDto, AulaGestionDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BajaAulaDialog } from "@/components/aulas/baja-aula-dialog";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ detalle: undefined as AulaDetalleDto | undefined }));
const darDeBaja = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-aulas", () => ({
  useAula: () => ({ data: state.detalle }),
  useDarDeBajaAula: () => ({ mutateAsync: darDeBaja, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const aula: AulaGestionDto = {
  id: "a7",
  codigo: "Aula 7",
  edificio: "Edificio B",
  piso: "PB",
  capacidad: 45,
  equipamiento: [],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
};

const clase = {
  id: "c1",
  fecha: "2026-10-14",
  horaInicio: "19:00",
  horaFin: "23:00",
  estado: "PROGRAMADA" as const,
  materia: "Proyecto Final",
  comision: "5K2",
};

beforeEach(() => {
  vi.clearAllMocks();
  darDeBaja.mockResolvedValue(aula);
  state.detalle = { ...aula, clases: [], incidencias: [], clasesAfectadas: [clase] };
});

describe("BajaAulaDialog", () => {
  it("lista las clases afectadas antes de confirmar la baja", async () => {
    const onClose = vi.fn();
    renderWithProviders(<BajaAulaDialog aula={aula} onClose={onClose} />);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/1 clase asignada sin terminar/)).toBeVisible();
    expect(within(dialog).getByText("Proyecto Final · 5K2")).toBeVisible();
    expect(darDeBaja).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(darDeBaja).toHaveBeenCalledWith("a7"));
    expect(onClose).toHaveBeenCalled();
  });

  it("no habilita la baja hasta que carga el detalle", async () => {
    state.detalle = undefined;
    renderWithProviders(<BajaAulaDialog aula={aula} onClose={() => {}} />);
    expect(await screen.findByRole("button", { name: /Dar de baja/ })).toBeDisabled();
  });

  it("deja volver aunque no haya cargado el detalle", async () => {
    state.detalle = undefined;
    const onClose = vi.fn();
    renderWithProviders(<BajaAulaDialog aula={aula} onClose={onClose} />);
    const volver = await screen.findByRole("button", { name: "Volver" });
    expect(volver).toBeEnabled();
    await userEvent.click(volver);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
