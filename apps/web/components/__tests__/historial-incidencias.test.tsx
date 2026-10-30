import type { ConsultaIncidenciasResultadoDto } from "@repo/api/client";
import type { ConsultaIncidencias } from "@repo/domain";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistorialIncidencias } from "@/components/incidencias/historial-incidencias";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  incidencias: undefined as ConsultaIncidenciasResultadoDto | undefined,
  consultas: [] as (ConsultaIncidencias | null)[],
}));

vi.mock("@/hooks/use-incidencias", () => ({
  useHistorialIncidencias: (consulta: ConsultaIncidencias | null) => {
    state.consultas.push(consulta);
    return { data: consulta ? state.incidencias : undefined };
  },
}));
vi.mock("@/hooks/use-historico", () => ({
  useOpcionesHistorico: () => ({
    data: { docentes: [], aulas: [{ id: "a1", codigo: "Aula 12" }] },
  }),
}));

const incidenciasConDatos: ConsultaIncidenciasResultadoDto = {
  total: 25,
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 2,
  incidencias: [
    {
      id: "i1",
      reportadaEn: "2026-10-14T15:30:00.000Z",
      aula: "Aula 12",
      elemento: "PROYECTOR",
      gravedad: "LEVE",
      estado: "RESUELTA",
      descripcion: "No enciende",
      reportadaPor: "Rosa Benítez",
      historial: [
        {
          estado: "ABIERTA",
          observaciones: null,
          createdAt: "2026-10-14T15:30:00.000Z",
          usuario: { id: "u1", nombre: "Rosa Benítez" },
        },
        {
          estado: "EN_CURSO",
          observaciones: "Técnico avisado",
          createdAt: "2026-10-14T16:45:00.000Z",
          usuario: { id: "u1", nombre: "Rosa Benítez" },
        },
      ],
    },
  ],
};

beforeEach(() => {
  state.incidencias = incidenciasConDatos;
  state.consultas = [];
});

describe("HistorialIncidencias", () => {
  it("muestra el total del período", () => {
    renderWithProviders(<HistorialIncidencias />);
    expect(screen.getByLabelText("Indicadores")).toHaveTextContent("Total25");
  });

  it("solo ofrece Desde, Hasta y Aula, sin filtro de estado", () => {
    renderWithProviders(<HistorialIncidencias />);
    expect(screen.getByLabelText("Aula")).toBeInTheDocument();
    for (const filtro of ["Carrera", "Materia", "Comisión", "Docente", "Estado"]) {
      expect(screen.queryByLabelText(filtro)).not.toBeInTheDocument();
    }
  });

  it("cada incidencia muestra fecha y hora, aula, elemento, gravedad, estado y quién reportó", () => {
    renderWithProviders(<HistorialIncidencias />);
    const fila = screen.getByLabelText("Incidencias resueltas");
    expect(fila).toHaveTextContent("14/10/2026 12:30");
    expect(fila).toHaveTextContent("Aula 12");
    expect(fila).toHaveTextContent("Proyector");
    expect(fila).toHaveTextContent("Leve");
    expect(fila).toHaveTextContent("Resuelta");
    expect(fila).toHaveTextContent("Rosa Benítez");
  });

  it("Detalle muestra la descripción y cada estado, sin acciones", async () => {
    renderWithProviders(<HistorialIncidencias />);
    await userEvent.click(screen.getByRole("button", { name: /Detalle de Aula 12/ }));
    const dialog = screen.getByRole("dialog", { name: "Aula 12 · Proyector" });
    expect(dialog).toHaveTextContent("No enciende");
    expect(dialog).toHaveTextContent("Abierta");
    expect(dialog).toHaveTextContent("Técnico avisado");
    expect(within(dialog).queryByRole("button", { name: /Pasar a|Resolver/ })).toBeNull();
  });

  it("sin datos dice Sin registros para el período", () => {
    state.incidencias = { ...incidenciasConDatos, total: 0, totalPaginas: 0, incidencias: [] };
    renderWithProviders(<HistorialIncidencias />);
    expect(screen.getByText("Sin registros para el período")).toBeInTheDocument();
  });

  it("un rango invertido muestra el error y no consulta", async () => {
    renderWithProviders(<HistorialIncidencias />);
    const inicial = state.consultas.at(-1);
    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2999-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).toBeVisible();
    expect(state.consultas.at(-1)).toBe(inicial);
    expect(screen.getByLabelText("Indicadores")).toHaveTextContent("Total25");
  });

  it("un rango de más de 12 meses muestra su mensaje y no consulta", async () => {
    renderWithProviders(<HistorialIncidencias />);
    const inicial = state.consultas.at(-1);
    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2020-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();
    expect(state.consultas.at(-1)).toBe(inicial);
  });

  it("envía el aula elegida y pagina con Página X de Y", async () => {
    renderWithProviders(<HistorialIncidencias />);
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Aula"), "a1");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(state.consultas.at(-1)).toMatchObject({ aulaId: "a1", pagina: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(state.consultas.at(-1)).toMatchObject({ aulaId: "a1", pagina: 2 });
  });
});
