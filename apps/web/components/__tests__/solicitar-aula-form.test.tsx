import type { BusquedaAulaDto, ClaseDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolicitarAulaForm } from "@/components/aulas/solicitar-aula-form";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  busqueda: undefined as BusquedaAulaDto | undefined,
  pedidos: [] as (object | null)[],
}));
const crear = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

const materia = {
  id: "m1",
  codigo: "K5-PF",
  nombre: "Proyecto Final",
  anioCarrera: 5,
  carreraId: "k",
};
const clase = {
  id: "clase-1",
  fecha: "2026-10-14",
  horaInicio: "19:00",
  horaFin: "23:00",
  comision: { id: "c1", codigo: "5K2", turno: "NOCHE" },
  materia,
  aula: { id: "a1", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" },
} as ClaseDto;

vi.mock("@/hooks/use-solicitudes-aula", () => ({
  useClasesSolicitables: () => ({ data: { fecha: "2026-10-14", clases: [clase] } }),
  useBuscarAulas: (pedido: object | null) => {
    state.pedidos.push(pedido);
    return { data: pedido ? state.busqueda : undefined, isFetching: false };
  },
  useCrearSolicitudAula: () => ({ mutateAsync: crear, isPending: false }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const aula = (codigo: string, capacidad: number, equipamiento: string[] = []) => ({
  id: codigo,
  codigo,
  edificio: "Edificio A",
  piso: "PB",
  capacidad,
  equipamiento,
});

const completarPedido = async (alumnos: string) => {
  await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
  if (alumnos) await userEvent.type(screen.getByLabelText("Cantidad de alumnos"), alumnos);
  await userEvent.click(screen.getByRole("button", { name: "Buscar aulas" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.pedidos = [];
  state.busqueda = { aulas: [aula("Aula 7", 45)], sugerencias: [], hayAulasLibres: true };
  crear.mockResolvedValue({});
});

describe("SolicitarAulaForm", () => {
  it.each(["", "0", "2.5"])("con alumnos %j avisa y no busca", async (alumnos) => {
    renderWithProviders(<SolicitarAulaForm />);
    await completarPedido(alumnos);
    expect(screen.getByText("Ingresá una cantidad de alumnos mayor que 0.")).toBeVisible();
    expect(state.pedidos.every((pedido) => pedido === null)).toBe(true);
  });

  it("muestra la franja y el aula de la clase elegida", async () => {
    renderWithProviders(<SolicitarAulaForm />);
    await userEvent.selectOptions(screen.getByLabelText("Clase"), "clase-1");
    expect(screen.getByText(/Franja 19:00 a 23:00/)).toBeVisible();
    expect(screen.getByText(/Aula actual: Aula 12/)).toBeVisible();
  });

  it("busca con alumnos y recursos, elige un aula y confirma con el comentario", async () => {
    renderWithProviders(<SolicitarAulaForm />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Proyector" }));
    await completarPedido("40");
    expect(state.pedidos.at(-1)).toEqual({
      claseId: "clase-1",
      alumnos: 40,
      recursos: ["Proyector"],
    });

    await userEvent.click(screen.getByRole("button", { name: "Elegir Aula 7" }));
    await userEvent.type(screen.getByLabelText(/Comentario/), "Con parlantes");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar solicitud" }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        claseId: "clase-1",
        alumnos: 40,
        recursos: ["Proyector"],
        aulaId: "Aula 7",
        comentario: "Con parlantes",
      }),
    );
    expect(push).toHaveBeenCalledWith("/aulas/mis-solicitudes");
  });

  it("sin coincidencias avisa y lista las sugerencias con el criterio que falla", async () => {
    state.busqueda = {
      aulas: [],
      sugerencias: [{ ...aula("Aula 12", 60), faltantes: ["Capacidad para 100 alumnos"] }],
      hayAulasLibres: true,
    };
    renderWithProviders(<SolicitarAulaForm />);
    await completarPedido("100");
    expect(screen.getByText("Ninguna aula cumple todos los criterios.")).toBeVisible();
    expect(screen.getByText("Capacidad para 100 alumnos")).toBeVisible();
  });

  it("sin aulas libres lo dice", async () => {
    state.busqueda = { aulas: [], sugerencias: [], hayAulasLibres: false };
    renderWithProviders(<SolicitarAulaForm />);
    await completarPedido("10");
    expect(screen.getByText("No hay aulas libres en esa franja.")).toBeVisible();
  });
});
