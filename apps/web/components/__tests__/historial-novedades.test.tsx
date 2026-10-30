import type { ConsultaNovedadesResultadoDto } from "@repo/api/client";
import { fechaArgentina, sumarDias, type ConsultaNovedades } from "@repo/domain";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistorialNovedades } from "@/components/novedades/historial-novedades";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  resultado: undefined as ConsultaNovedadesResultadoDto | undefined,
  consultas: [] as (object | null)[],
}));

vi.mock("@/hooks/use-novedades", () => ({
  useHistorialNovedades: (consulta: ConsultaNovedades | null) => {
    state.consultas.push(consulta);
    return { data: consulta ? state.resultado : undefined };
  },
}));
vi.mock("@/hooks/use-historico", () => ({
  useOpcionesHistorico: () => ({
    data: {
      docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
      aulas: [{ id: "a1", codigo: "Aula 12" }],
    },
  }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [{ id: "k", codigo: "K", nombre: "Sistemas" }] }),
  useMaterias: () => ({ data: [{ id: "m1", nombre: "Proyecto Final" }] }),
  useComisiones: () => ({
    data: [{ id: "c1", codigo: "5K2", materia: { nombre: "Proyecto Final" } }],
  }),
}));

const hoy = fechaArgentina(new Date());
const vacio: ConsultaNovedadesResultadoDto = {
  total: 0,
  porTipo: { AUSENCIA: 0, DEMORA: 0, VIRTUAL: 0, SUSPENSION: 0, CAMBIO_AULA: 0 },
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 0,
  novedades: [],
};
const conDatos: ConsultaNovedadesResultadoDto = {
  total: 25,
  porTipo: { AUSENCIA: 5, DEMORA: 20, VIRTUAL: 0, SUSPENSION: 0, CAMBIO_AULA: 0 },
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 2,
  novedades: [
    {
      id: "n1",
      tipo: "DEMORA",
      estado: "FINALIZADA",
      minutosDemora: 10,
      enlaceVirtual: null,
      aulaNueva: null,
      mensaje: null,
      publicadaPor: { id: "u1", nombre: "Rosa Benítez" },
      publicadaPorBedelia: true,
      createdAt: "2026-10-14T15:30:00.000Z",
      finalizadaEn: "2026-10-15T15:30:00.000Z",
      editable: false,
      comision: { id: "c1", codigo: "5K2", materia: "Proyecto Final" },
      clases: [
        {
          id: "k1",
          fecha: "2026-10-15",
          horaInicio: "19:00",
          horaFin: "23:00",
          estado: "PROGRAMADA",
        },
      ],
    },
  ],
};

const ultimaConsulta = () => state.consultas.at(-1) as ConsultaNovedades;

beforeEach(() => {
  state.resultado = conDatos;
  state.consultas = [];
});

describe("HistorialNovedades", () => {
  it("arranca con los últimos 30 días ya consultados", () => {
    renderWithProviders(<HistorialNovedades />);
    expect(screen.getByLabelText("Desde")).toHaveValue(sumarDias(hoy, -30));
    expect(screen.getByLabelText("Hasta")).toHaveValue(hoy);
    expect(ultimaConsulta()).toMatchObject({ desde: sumarDias(hoy, -30), hasta: hoy, pagina: 1 });
  });

  it("muestra total, cantidad por tipo y cada novedad finalizada sin acciones", () => {
    renderWithProviders(<HistorialNovedades />);
    const indicadores = screen.getByLabelText("Indicadores");
    expect(within(indicadores).getByText("Total").nextSibling).toHaveTextContent("25");
    expect(within(indicadores).getByText("Demora").nextSibling).toHaveTextContent("20");
    expect(within(indicadores).getByText("Virtual").nextSibling).toHaveTextContent("0");
    const novedad = screen
      .getByText("Proyecto Final · 5K2 · 15/10/2026 19:00")
      .closest("[data-slot=item]");
    expect(novedad).toHaveTextContent("Finalizada");
    expect(novedad).toHaveTextContent("Rosa Benítez (bedelía)");
    expect(screen.queryByRole("button", { name: /Acciones de la novedad/ })).toBeNull();
  });

  it("sin datos dice Sin registros para el período", () => {
    state.resultado = vacio;
    renderWithProviders(<HistorialNovedades />);
    expect(screen.getByText("Sin registros para el período")).toBeInTheDocument();
  });

  it.each([
    ["Desde", "", "Ingresá la fecha desde"],
    ["Hasta", "", "Ingresá la fecha hasta"],
  ])("el campo %s vacío muestra el error y no consulta", async (campo, valor, mensaje) => {
    renderWithProviders(<HistorialNovedades />);
    const inicial = ultimaConsulta();
    await userEvent.clear(screen.getByLabelText(campo));
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(valor).toBe("");
    expect(ultimaConsulta()).toBe(inicial);
  });

  it("muestra el error de rango invertido y de más de 12 meses", async () => {
    renderWithProviders(<HistorialNovedades />);
    const desde = screen.getByLabelText("Desde");
    await userEvent.clear(desde);
    await userEvent.type(desde, "2026-03-02");
    await userEvent.clear(screen.getByLabelText("Hasta"));
    await userEvent.type(screen.getByLabelText("Hasta"), "2026-03-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Hasta"));
    await userEvent.type(screen.getByLabelText("Hasta"), "2027-03-03");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(
      screen.getByText("El rango de fechas no puede superar los 12 meses"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).not.toBeInTheDocument();
  });

  it("12 meses justos consulta y limpia el error", async () => {
    renderWithProviders(<HistorialNovedades />);
    await userEvent.clear(screen.getByLabelText("Hasta"));
    await userEvent.type(screen.getByLabelText("Hasta"), "2027-12-31");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();

    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2026-12-31");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.queryByText(/no puede superar/)).not.toBeInTheDocument();
    expect(ultimaConsulta()).toMatchObject({ desde: "2026-12-31", hasta: "2027-12-31" });
  });

  it("envía el tipo elegido y no ofrece filtros académicos", async () => {
    renderWithProviders(<HistorialNovedades />);
    for (const filtro of ["Carrera", "Materia", "Comisión", "Docente", "Aula"]) {
      expect(screen.queryByLabelText(filtro)).not.toBeInTheDocument();
    }
    await userEvent.selectOptions(screen.getByLabelText("Tipo de novedad"), "DEMORA");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(ultimaConsulta()).toMatchObject({ tipo: "DEMORA", pagina: 1 });
  });

  it("pagina con Siguiente y Anterior", async () => {
    renderWithProviders(<HistorialNovedades />);
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página anterior" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(ultimaConsulta()).toMatchObject({ pagina: 2 });
  });
});
