import type { AulaDetalleDto, AulaGestionDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AulaFormDialog } from "@/components/aulas/aula-form-dialog";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ detalle: undefined as AulaDetalleDto | undefined }));
const crear = vi.hoisted(() => vi.fn());
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-aulas", () => ({
  useCrearAula: () => ({ mutateAsync: crear, isPending: false }),
  useActualizarAula: () => ({ mutateAsync: actualizar, isPending: false }),
  useAula: () => ({ data: state.detalle }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const aula: AulaGestionDto = {
  id: "a7",
  codigo: "Aula 7",
  edificio: "Edificio B",
  piso: "PB",
  capacidad: 45,
  equipamiento: ["Proyector"],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  state.detalle = {
    ...aula,
    clases: [],
    clasesAfectadas: [
      {
        id: "c1",
        fecha: "2026-10-14",
        horaInicio: "19:00",
        horaFin: "23:00",
        estado: "PROGRAMADA",
        materia: "Proyecto Final",
        comision: "5K2",
      },
    ],
  };
  crear.mockResolvedValue(aula);
  actualizar.mockResolvedValue(aula);
});

describe("AulaFormDialog", () => {
  it("no guarda con capacidad fuera de 1 a 500 ni con obligatorios vacíos", async () => {
    renderWithProviders(<AulaFormDialog onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Nueva aula" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("Ingresá el código")).toBeVisible();
    expect(within(dialog).getByText("Ingresá el edificio")).toBeVisible();

    await userEvent.type(within(dialog).getByLabelText("Código"), "Aula 99");
    await userEvent.type(within(dialog).getByLabelText("Edificio"), "A");
    await userEvent.type(within(dialog).getByLabelText("Piso"), "PB");
    await userEvent.type(within(dialog).getByLabelText("Capacidad"), "501");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("La capacidad máxima es 500")).toBeVisible();
    expect(crear).not.toHaveBeenCalled();
  });

  it("ofrece solo los tres estados editables, sin Ocupada", () => {
    renderWithProviders(<AulaFormDialog onClose={() => {}} />);
    const opciones = within(screen.getByLabelText("Estado")).getAllByRole("option");
    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      "Disponible",
      "Fuera de servicio",
      "En mantenimiento",
    ]);
  });

  it("da de alta con equipamiento y muestra el código repetido junto al campo", async () => {
    crear.mockRejectedValueOnce(
      new RequestError(409, "CONFLICT", "Ya existe un aula con ese código"),
    );
    renderWithProviders(<AulaFormDialog onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Nueva aula" });
    await userEvent.type(within(dialog).getByLabelText("Código"), "Aula 7");
    await userEvent.type(within(dialog).getByLabelText("Edificio"), "B");
    await userEvent.type(within(dialog).getByLabelText("Piso"), "PB");
    await userEvent.type(within(dialog).getByLabelText("Capacidad"), "35");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Pizarra" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("Ya existe un aula con ese código")).toBeVisible();
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "Aula 7", capacidad: 35, equipamiento: ["Pizarra"] }),
    );
  });

  it("al sacar de servicio un aula con clases lista las afectadas antes de confirmar", async () => {
    const onClose = vi.fn();
    renderWithProviders(<AulaFormDialog aula={aula} onClose={onClose} />);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "EN_MANTENIMIENTO");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const confirmacion = await screen.findByRole("alertdialog");
    expect(within(confirmacion).getByText("1 clase afectada:")).toBeVisible();
    expect(within(confirmacion).getByText("Proyecto Final · 5K2")).toBeVisible();
    expect(actualizar).not.toHaveBeenCalled();

    await userEvent.click(within(confirmacion).getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith(
        expect.objectContaining({ estado: "EN_MANTENIMIENTO" }),
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("sin cambio de estado guarda directo", async () => {
    renderWithProviders(<AulaFormDialog aula={aula} onClose={() => {}} />);
    await userEvent.clear(screen.getByLabelText("Capacidad"));
    await userEvent.type(screen.getByLabelText("Capacidad"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith(expect.objectContaining({ capacidad: 50 })),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("en la edición no permite guardar hasta que carga el detalle", () => {
    state.detalle = undefined;
    renderWithProviders(<AulaFormDialog aula={aula} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
