import type { ComisionDto, PreferenciasDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComisionesSection } from "@/components/mi-cuenta/comisiones-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ preferencias: undefined as PreferenciasDto | undefined }));
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-preferencias", () => ({
  usePreferencias: () => ({ data: state.preferencias }),
  useActualizarPreferencias: () => ({ mutateAsync: actualizar, isPending: false }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [] }),
  useMaterias: () => ({ data: [] }),
  useComisiones: () => ({ data: undefined }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const comision = {
  id: "c1",
  codigo: "5K2",
  turno: "MANANA",
  materia: { id: "m1", nombre: "Algoritmos", anioCarrera: 1 },
  docentes: [],
} as unknown as ComisionDto;

beforeEach(() => {
  actualizar.mockReset().mockResolvedValue(undefined);
  state.preferencias = {
    comisiones: [comision],
    notificarNovedadesPorCorreo: true,
    notificarAvisosPorCorreo: false,
  };
});

describe("ComisionesSection", () => {
  it("guarda solo las comisiones, sin las opciones de correo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComisionesSection />);
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Quitar" }));
    await user.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ comisionIds: [] }));
  });
});
