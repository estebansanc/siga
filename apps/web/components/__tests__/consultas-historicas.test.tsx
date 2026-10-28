import type { ConsultaAsistenciasResultadoDto } from "@repo/api/client";
import type { ConsultaAsistencias } from "@repo/domain";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsultasHistoricas } from "@/components/historico/consultas-historicas";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  resultado: undefined as ConsultaAsistenciasResultadoDto | undefined,
  consultas: [] as (object | null)[],
}));

vi.mock("@/hooks/use-historico", () => ({
  useConsultaAsistencias: (consulta: ConsultaAsistencias | null) => {
    state.consultas.push(consulta);
    return { data: consulta ? state.resultado : undefined };
  },
  useConsultaNovedades: () => ({ data: undefined }),
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

const indicadores = {
  clasesBase: 8,
  clasesConAsistencia: 6,
  porcentajeAsistencia: 75,
  clasesSinRegistro: 2,
  registrosQr: 5,
  porcentajeQr: 83.3,
  registrosManuales: 1,
};
const conDatos: ConsultaAsistenciasResultadoDto = {
  indicadores,
  total: 25,
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 2,
  registros: [
    {
      id: "r1",
      registradaEn: "2026-10-14T15:30:00.000Z",
      docente: "Marcos Álvarez",
      materia: "Proyecto Final",
      comision: "5K2",
      aula: "Aula 12",
      metodo: "MANUAL",
      registradaPor: "Rosa Benítez",
      registradaPorBedelia: true,
    },
    {
      id: "r2",
      registradaEn: "2026-10-13T22:05:00.000Z",
      docente: "Marcos Álvarez",
      materia: "Proyecto Final",
      comision: "5K2",
      aula: null,
      metodo: "QR",
      registradaPor: "Marcos Álvarez",
      registradaPorBedelia: false,
    },
  ],
};
const vacio: ConsultaAsistenciasResultadoDto = {
  ...conDatos,
  indicadores: {
    ...indicadores,
    clasesBase: 0,
    clasesConAsistencia: 0,
    porcentajeAsistencia: null,
    porcentajeQr: null,
    clasesSinRegistro: 0,
    registrosQr: 0,
    registrosManuales: 0,
  },
  total: 0,
  totalPaginas: 0,
  registros: [],
};

const ultimaConsulta = () => state.consultas.at(-1) as ConsultaAsistencias;

beforeEach(() => {
  state.resultado = conDatos;
  state.consultas = [];
});

describe("ConsultasHistoricas", () => {
  it("la Autoridad elige entre Asistencia docente y Novedades", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    expect(screen.getByRole("tab", { name: "Asistencia docente", selected: true })).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "Novedades" }));
    expect(screen.getByLabelText("Tipo de novedad")).toBeInTheDocument();
  });

  it("el Bedel solo ve la asistencia docente", () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Indicadores")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tipo de novedad")).not.toBeInTheDocument();
  });

  it("muestra los cuatro indicadores del período", () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    const lista = within(screen.getByLabelText("Indicadores"));
    expect(lista.getByText("Asistencia docente").parentElement).toHaveTextContent(
      "75%6 de 8 clases",
    );
    expect(lista.getByText("Registros por QR").parentElement).toHaveTextContent("583.3% del total");
    expect(lista.getByText("Registros manuales").nextSibling).toHaveTextContent("1");
    expect(lista.getByText("Clases sin registro").nextSibling).toHaveTextContent("2");
  });

  it("cada fila distingue el manual del QR y muestra al Bedel", () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    const [, manual, qr] = screen.getAllByRole("row");
    expect(manual).toHaveTextContent("14/10/2026 12:30");
    expect(manual).toHaveTextContent("Marcos Álvarez");
    expect(manual).toHaveTextContent("Proyecto Final · 5K2");
    expect(manual).toHaveTextContent("Aula 12");
    expect(manual).toHaveTextContent("Manual");
    expect(manual).toHaveTextContent("Rosa Benítez (Bedelía)");
    expect(qr).toHaveTextContent("QR");
    expect(qr).not.toHaveTextContent("Bedelía");
  });

  it("sin datos dice Sin registros para el período", () => {
    state.resultado = vacio;
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    expect(screen.getByText("Sin registros para el período")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("un rango de más de 12 meses muestra el error y no consulta", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    const inicial = ultimaConsulta();
    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2020-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();
    expect(ultimaConsulta()).toBe(inicial);
  });

  it("envía los filtros combinados y pagina", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    await userEvent.selectOptions(screen.getByLabelText("Docente"), "d1");
    await userEvent.selectOptions(screen.getByLabelText("Aula"), "a1");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(ultimaConsulta()).toMatchObject({ docenteId: "d1", aulaId: "a1", pagina: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(ultimaConsulta()).toMatchObject({ docenteId: "d1", pagina: 2 });
  });
});
