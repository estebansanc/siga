import type { AulaGestionDto } from "@repo/api/client";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AulasSection } from "@/components/aulas/aulas-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ aulas: [] as AulaGestionDto[], bajasPedidas: [] as boolean[] }));
const reactivar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-aulas", () => ({
  useAulas: (bajas: boolean) => {
    state.bajasPedidas.push(bajas);
    return { data: state.aulas.filter((aula) => aula.activa === !bajas) };
  },
  useReactivarAula: () => ({ mutateAsync: reactivar, isPending: false }),
  useAula: () => ({ data: undefined }),
  useCrearAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useActualizarAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDarDeBajaAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base: AulaGestionDto = {
  id: "a12",
  codigo: "Aula 12",
  edificio: "Edificio A",
  piso: "1.º piso",
  capacidad: 60,
  equipamiento: ["Proyector", "Climatizacion"],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  state.bajasPedidas = [];
  reactivar.mockResolvedValue(base);
  state.aulas = [
    base,
    { ...base, id: "a7", codigo: "Aula 7", ocupada: true },
    { ...base, id: "a3", codigo: "Aula 3", estado: "EN_MANTENIMIENTO" },
    { ...base, id: "a99", codigo: "Aula 99", activa: false },
  ];
});

describe("AulasSection", () => {
  it("lista las activas con ubicación, capacidad, equipamiento y estado; Ocupada prevalece", () => {
    renderWithProviders(<AulasSection />);
    const items = screen.getAllByText(/^Aula \d+$/);
    expect(items.map((item) => item.firstChild?.textContent)).toEqual([
      "Aula 12",
      "Aula 7",
      "Aula 3",
    ]);
    expect(
      screen.getAllByText(/Edificio A, 1.º piso · 60 lugares · Proyector, Climatización/),
    ).toHaveLength(3);
    expect(screen.getByText("Ocupada")).toBeVisible();
    expect(screen.getByText("En mantenimiento")).toBeVisible();
    expect(screen.queryByText("Aula 99")).not.toBeInTheDocument();
  });

  it("con el filtro de dadas de baja ofrece reactivar", async () => {
    renderWithProviders(<AulasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Dadas de baja" }));
    expect(screen.getByText("Aula 99")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Acciones de Aula 99" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reactivar" }));
    expect(reactivar).toHaveBeenCalledWith("a99");
  });

  it("Nueva aula abre el formulario de alta", async () => {
    renderWithProviders(<AulasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Nueva aula" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Código")).toBeVisible();
  });
});
