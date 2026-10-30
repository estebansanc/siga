import type { AulaDetalleDto, AulaGestionDto, PlanoAulaDto } from "@repo/api/client";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AulasBedel } from "@/components/aulas/aulas-bedel";
import { renderWithProviders } from "@/test/render";

const replace = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ vista: "", plano: true }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(state.vista ? { vista: state.vista } : {}),
}));
vi.mock("@/components/incidencias/incidencias-section", () => ({
  IncidenciaItem: () => null,
  proponeFueraDeServicio: () => false,
}));
vi.mock("@/components/aulas/plano-acciones", () => ({
  PlanoAcciones: () => <button type="button">Asignar clase</button>,
}));

const gestion: AulaGestionDto = {
  id: "a1",
  codigo: "Aula 1",
  edificio: "Edificio A",
  piso: "PB",
  capacidad: 30,
  equipamiento: [],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
};
const planoAula: PlanoAulaDto = {
  id: "a1",
  codigo: "Aula 1",
  edificio: "Edificio A",
  piso: "PB",
  capacidad: 30,
  estadoAula: "DISPONIBLE",
  estado: "LIBRE",
  claseEnCurso: null,
  proximaClase: null,
};

vi.mock("@/hooks/use-aulas", () => ({
  useAulas: () => ({ data: [gestion] }),
  usePlanoAulas: () => ({ data: state.plano ? [planoAula] : [] }),
  useAula: () => ({
    data: { ...gestion, clases: [], incidencias: [] } as unknown as AulaDetalleDto,
  }),
  useReactivarAula: () => ({ mutateAsync: vi.fn() }),
  useCrearAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useActualizarAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDarDeBajaAula: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.vista = "";
  state.plano = true;
});

describe("AulasBedel", () => {
  it("abre en la Lista y Nueva aula está disponible", async () => {
    renderWithProviders(<AulasBedel perfil="BEDEL" />);
    expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Estado y ocupación en tiempo real. Cada cambio queda en auditoría."),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Nueva aula" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Código")).toBeVisible();
  });

  it("cambia al Plano, lo deja en la URL y conserva Nueva aula", async () => {
    const { rerender } = renderWithProviders(<AulasBedel perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Plano" }));
    expect(replace).toHaveBeenCalledWith("/aulas?vista=plano");
    state.vista = "plano";
    rerender(<AulasBedel perfil="BEDEL" />);
    expect(screen.getByRole("button", { name: /Aula 1/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Nueva aula" })).toBeVisible();

    state.vista = "";
    rerender(<AulasBedel perfil="BEDEL" />);
    expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute("aria-pressed", "true");
  });

  it("el detalle es el mismo desde la Lista y desde el Plano", async () => {
    const view = renderWithProviders(<AulasBedel perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Detalle" }));
    const desdeLista = within(screen.getByRole("dialog", { name: "Aula 1" })).getByText(
      "Reportar incidencia",
    );
    expect(desdeLista).toBeVisible();
    expect(screen.getByRole("button", { name: "Asignar clase" })).toBeVisible();
    await userEvent.keyboard("{Escape}");

    state.vista = "plano";
    view.rerender(<AulasBedel perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    const dialog = screen.getByRole("dialog", { name: "Aula 1" });
    expect(within(dialog).getByText("Reportar incidencia")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Asignar clase" })).toBeVisible();
    expect(within(dialog).getByText("Libre en este momento.")).toBeVisible();
  });

  it("un aula que no está en el plano (dada de baja) no muestra clase ni acciones", async () => {
    state.plano = false;
    renderWithProviders(<AulasBedel perfil="BEDEL" />);
    await userEvent.click(screen.getByRole("button", { name: "Detalle" }));
    const dialog = screen.getByRole("dialog", { name: "Aula 1" });
    expect(within(dialog).getByText("Reportar incidencia")).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Asignar clase" })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Libre en este momento.")).not.toBeInTheDocument();
  });
});
