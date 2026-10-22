import type { AulaDetalleDto, IncidenciaDetalleDto, IncidenciaDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IncidenciasSection } from "@/components/incidencias/incidencias-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  incidencias: [] as IncidenciaDto[],
  detalle: undefined as IncidenciaDetalleDto | undefined,
  estadosPedidos: [] as string[][],
  aula: undefined as AulaDetalleDto | undefined,
}));
const reportar = vi.hoisted(() => vi.fn());
const cambiarEstado = vi.hoisted(() => vi.fn());
const actualizarAula = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-incidencias", () => ({
  useIncidencias: (estados: string[]) => {
    state.estadosPedidos.push(estados);
    return { data: state.incidencias };
  },
  useIncidencia: () => ({ data: state.detalle }),
  useReportarIncidencia: () => ({ mutateAsync: reportar, isPending: false }),
  useCambiarEstadoIncidencia: () => ({ mutateAsync: cambiarEstado, isPending: false }),
}));
vi.mock("@/hooks/use-aulas", () => ({
  useAulas: () => ({
    data: [{ id: "a12", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" }],
  }),
  useAula: () => ({ data: state.aula }),
  useActualizarAula: () => ({ mutateAsync: actualizarAula, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const aula = {
  id: "a12",
  codigo: "Aula 12",
  edificio: "Edificio A",
  piso: "1.º piso",
  estado: "DISPONIBLE" as const,
};

const incidencia: IncidenciaDto = {
  id: "i1",
  aula,
  elemento: "PROYECTOR",
  descripcion: "No enciende",
  gravedad: "IMPIDE_USO",
  estado: "ABIERTA",
  tieneFoto: true,
  createdAt: "2026-10-14T21:00:00.000Z",
  reportadaPor: { id: "u1", nombre: "Rosa Benítez" },
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
  state.estadosPedidos = [];
  state.incidencias = [incidencia];
  state.detalle = {
    ...incidencia,
    fotoUrl: "https://r2.test/foto.jpg",
    historial: [
      {
        estado: "ABIERTA",
        observaciones: null,
        createdAt: "2026-10-14T21:00:00.000Z",
        usuario: { id: "u1", nombre: "Rosa Benítez" },
      },
    ],
  };
  state.aula = {
    ...aula,
    capacidad: 60,
    equipamiento: [],
    observaciones: null,
    activa: true,
    ocupada: false,
    clases: [],
    clasesAfectadas: [clase],
    incidencias: [],
  };
  reportar.mockResolvedValue(incidencia);
  cambiarEstado.mockResolvedValue(state.detalle);
  actualizarAula.mockResolvedValue({});
});

describe("IncidenciasSection", () => {
  it("lista aula, elemento, gravedad, estado, fecha y quién reportó, y pide Abiertas y En curso", () => {
    renderWithProviders(<IncidenciasSection />);
    const item = screen.getByText(/Aula 12 · Proyector/).closest('[data-slot="item"]');
    expect(item).toHaveTextContent("Abierta");
    expect(item).toHaveTextContent("Impide el uso del aula");
    expect(item).toHaveTextContent("Rosa Benítez");
    expect(state.estadosPedidos[0]).toEqual(["ABIERTA", "EN_CURSO"]);
  });

  it("filtra por estado y mantiene al menos uno elegido", async () => {
    renderWithProviders(<IncidenciasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Resuelta" }));
    expect(state.estadosPedidos.at(-1)).toEqual(["ABIERTA", "EN_CURSO", "RESUELTA"]);
  });

  it("al reportar una que impide el uso propone Fuera de servicio con las clases afectadas", async () => {
    renderWithProviders(<IncidenciasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Nueva incidencia" }));
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a12");
    await userEvent.selectOptions(within(dialog).getByLabelText("Elemento afectado"), "PROYECTOR");
    await userEvent.type(within(dialog).getByLabelText("Descripción"), "No enciende");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reportar" }));

    const propuesta = await screen.findByRole("alertdialog");
    expect(within(propuesta).getByText("¿Pasar Aula 12 a Fuera de servicio?")).toBeVisible();
    expect(within(propuesta).getByText("Proyecto Final · 5K2")).toBeVisible();
    await userEvent.click(
      within(propuesta).getByRole("button", { name: "Pasar a Fuera de servicio" }),
    );
    await waitFor(() =>
      expect(actualizarAula).toHaveBeenCalledWith({ estado: "FUERA_DE_SERVICIO" }),
    );
  });

  it("el detalle muestra foto e historial y resuelve rehabilitando el aula", async () => {
    state.detalle = {
      ...state.detalle!,
      estado: "EN_CURSO",
      aula: { ...aula, estado: "FUERA_DE_SERVICIO" },
    };
    renderWithProviders(<IncidenciasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Detalle" }));
    const detalle = await screen.findByRole("dialog", { name: /Aula 12 · Proyector/ });
    expect(within(detalle).getByRole("img", { name: "Foto de la incidencia" })).toHaveAttribute(
      "src",
      "https://r2.test/foto.jpg",
    );
    expect(
      within(detalle).getByText(/Rosa Benítez/, { selector: "[data-slot=item-description]" }),
    ).toBeVisible();

    await userEvent.click(within(detalle).getByRole("button", { name: "Resolver" }));
    const resolver = await screen.findByRole("dialog", { name: "Resolver incidencia" });
    await userEvent.type(within(resolver).getByLabelText(/Observaciones/), "Cambiaron la lámpara");
    await userEvent.click(within(resolver).getByRole("checkbox", { name: /Rehabilitar el aula/ }));
    await userEvent.click(within(resolver).getByRole("button", { name: "Resolver" }));

    await waitFor(() => expect(cambiarEstado).toHaveBeenCalled());
    expect(cambiarEstado).toHaveBeenCalledWith({
      estado: "RESUELTA",
      observaciones: "Cambiaron la lámpara",
      rehabilitarAula: true,
    });
  });

  it("una incidencia Resuelta no ofrece más cambios", async () => {
    state.detalle = { ...state.detalle!, estado: "RESUELTA" };
    renderWithProviders(<IncidenciasSection />);
    await userEvent.click(screen.getByRole("button", { name: "Detalle" }));
    const detalle = await screen.findByRole("dialog", { name: /Aula 12 · Proyector/ });
    expect(within(detalle).queryByRole("button", { name: "Resolver" })).toBeNull();
    expect(within(detalle).queryByRole("button", { name: "Pasar a En curso" })).toBeNull();
  });
});
