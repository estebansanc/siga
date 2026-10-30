import type { ComisionDto, PreferenciasDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComisionesSection } from "@/components/mi-cuenta/comisiones-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  preferencias: undefined as PreferenciasDto | undefined,
  pendiente: false,
  comisiones: undefined as unknown[] | undefined,
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-preferencias", () => ({
  usePreferencias: () => ({ data: state.preferencias }),
  useActualizarPreferencias: () => ({ mutateAsync: actualizar, isPending: state.pendiente }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [] }),
  useMaterias: () => ({ data: [{ id: "m1", nombre: "Algoritmos" }] }),
  useComisiones: () => ({ data: state.comisiones }),
}));
vi.mock("sonner", () => ({ toast }));

const comision = {
  id: "c1",
  codigo: "5K2",
  turno: "MANANA",
  materia: { id: "m1", nombre: "Algoritmos", anioCarrera: 1 },
  docentes: [],
} as unknown as ComisionDto;

beforeEach(() => {
  actualizar.mockReset().mockResolvedValue(undefined);
  toast.success.mockReset();
  toast.error.mockReset();
  state.pendiente = false;
  state.comisiones = undefined;
  state.preferencias = {
    comisiones: [comision],
    notificarNovedadesPorCorreo: true,
    notificarAvisosPorCorreo: false,
  };
});

const otra: ComisionDto = { ...comision, id: "c2", codigo: "5K3" };

describe("ComisionesSection", () => {
  it("no tiene Guardar", () => {
    renderWithProviders(<ComisionesSection />);
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });

  it("Quitar guarda al momento solo las comisiones y avisa", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComisionesSection />);
    await user.click(screen.getByRole("button", { name: /Quitar/ }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ comisionIds: [] }));
    expect(toast.success).toHaveBeenCalledWith("Comisión quitada");
  });

  it("Agregar guarda la lista completa y avisa", async () => {
    state.comisiones = [comision, otra];
    const user = userEvent.setup();
    renderWithProviders(<ComisionesSection />);
    await user.selectOptions(screen.getByLabelText("Materia"), "m1");
    await user.click(screen.getByRole("button", { name: "Agregar 5K3 de Algoritmos" }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ comisionIds: ["c1", "c2"] }));
    expect(toast.success).toHaveBeenCalledWith("Comisión agregada");
  });

  it("mientras guarda bloquea Quitar y Agregar", async () => {
    const user = userEvent.setup();
    state.pendiente = true;
    state.comisiones = [otra];
    renderWithProviders(<ComisionesSection />);
    await user.selectOptions(screen.getByLabelText("Materia"), "m1");
    expect(screen.getByRole("button", { name: /Quitar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agregar 5K3 de Algoritmos" })).toBeDisabled();
  });

  it("si falla muestra el error y no el éxito", async () => {
    actualizar.mockRejectedValue(new Error("sin red"));
    const user = userEvent.setup();
    renderWithProviders(<ComisionesSection />);
    await user.click(screen.getByRole("button", { name: /Quitar/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ocurrió un error inesperado"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Quitar/ })).toBeEnabled();
  });

  it("mientras guarda, el botón activo muestra un spinner", async () => {
    actualizar.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderWithProviders(<ComisionesSection />);
    const quitar = screen.getByRole("button", { name: /Quitar/ });
    await user.click(quitar);
    await waitFor(() => expect(quitar).toBeDisabled());
    expect(within(quitar).getByRole("status")).toBeInTheDocument();
  });
});
