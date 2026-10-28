import type {
  ConsultaAsistenciasResultadoDto,
  ConsultaUsoAulasResultadoDto,
} from "@repo/api/client";
import type { ConsultaAsistencias, ConsultaUsoAulas } from "@repo/domain";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsultasHistoricas } from "@/components/historico/consultas-historicas";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  resultado: undefined as ConsultaAsistenciasResultadoDto | undefined,
  consultas: [] as (object | null)[],
  usoAulas: undefined as ConsultaUsoAulasResultadoDto | undefined,
  consultasUsoAulas: [] as (ConsultaUsoAulas | null)[],
}));

vi.mock("@/hooks/use-historico", () => ({
  useConsultaAsistencias: (consulta: ConsultaAsistencias | null) => {
    state.consultas.push(consulta);
    return { data: consulta ? state.resultado : undefined };
  },
  useConsultaNovedades: () => ({ data: undefined }),
  useConsultaUsoAulas: (consulta: ConsultaUsoAulas | null) => {
    state.consultasUsoAulas.push(consulta);
    return { data: consulta ? state.usoAulas : undefined };
  },
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

const usoAulasConDatos: ConsultaUsoAulasResultadoDto = {
  ocupacionGeneral: { horasOcupadas: 6, horasDisponibles: 198, porcentaje: 3 },
  aulas: [
    {
      id: "a1",
      codigo: "Aula 12",
      edificio: "Edificio A",
      piso: "1.º piso",
      activa: true,
      horasOcupadas: 4,
      horasDisponibles: 99,
      porcentaje: 4,
    },
    {
      id: "a2",
      codigo: "Aula 1",
      edificio: "Edificio B",
      piso: "PB",
      activa: false,
      horasOcupadas: 2,
      horasDisponibles: 99,
      porcentaje: 2,
    },
  ],
  clasesDelPeriodo: 2,
  total: 25,
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 2,
  asignaciones: [
    {
      id: "s1",
      asignadaEn: "2026-10-14T15:30:00.000Z",
      aula: "Aula 12",
      materia: "Proyecto Final",
      comision: "5K2",
      fechaClase: "2026-10-16",
      horaInicioClase: "19:00",
      horaFinClase: "23:00",
      origen: "ASIGNACION_BEDELIA",
      usuario: "Rosa Benítez",
    },
  ],
};

const ultimaConsulta = () => state.consultas.at(-1) as ConsultaAsistencias;

beforeEach(() => {
  state.resultado = conDatos;
  state.consultas = [];
  state.usoAulas = usoAulasConDatos;
  state.consultasUsoAulas = [];
});

describe("ConsultasHistoricas", () => {
  it("la Autoridad elige entre Asistencia docente y Novedades", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    expect(screen.getByRole("tab", { name: "Asistencia docente", selected: true })).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "Novedades" }));
    expect(screen.getByLabelText("Tipo de novedad")).toBeInTheDocument();
  });

  it("el Bedel arranca en Uso de aulas y no ve Novedades", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    expect(screen.getByRole("tab", { name: "Uso de aulas", selected: true })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Asistencia docente" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Novedades" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Asistencia docente" }));
    expect(screen.getByLabelText("Indicadores")).toBeInTheDocument();
  });

  it("muestra los cuatro indicadores del período", () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    const lista = within(screen.getByLabelText("Indicadores"));
    expect(lista.getByText("Asistencia docente").parentElement).toHaveTextContent(
      "75%6 de 8 clases",
    );
    expect(lista.getByText("Registros por QR").parentElement).toHaveTextContent("583.3% del total");
    expect(lista.getByText("Registros manuales").nextSibling).toHaveTextContent("1");
    expect(lista.getByText("Clases sin registro").nextSibling).toHaveTextContent("2");
  });

  it("cada fila distingue el manual del QR y muestra al Bedel", () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
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
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    expect(screen.getByText("Sin registros para el período")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("un rango de más de 12 meses muestra el error y no consulta", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    const inicial = ultimaConsulta();
    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2020-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(screen.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();
    expect(ultimaConsulta()).toBe(inicial);
  });

  it("envía los filtros combinados y pagina", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    await userEvent.selectOptions(screen.getByLabelText("Docente"), "d1");
    await userEvent.selectOptions(screen.getByLabelText("Aula"), "a1");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(ultimaConsulta()).toMatchObject({ docenteId: "d1", aulaId: "a1", pagina: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(ultimaConsulta()).toMatchObject({ docenteId: "d1", pagina: 2 });
  });
});

describe("Uso de aulas", () => {
  it("la Autoridad lo elige entre los tipos de consulta", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="AUTORIDAD" />);
    await userEvent.click(screen.getByRole("tab", { name: "Uso de aulas" }));
    expect(screen.getByLabelText("Origen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tipo de novedad")).not.toBeInTheDocument();
  });

  it("muestra la ocupación general y por aula con horas y porcentaje", () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    expect(screen.getByLabelText("Ocupación general")).toHaveTextContent("3%");
    expect(screen.getByLabelText("Ocupación general")).toHaveTextContent(
      "6 h ocupadas de 198 h disponibles",
    );
    const [, aula, baja] = within(
      screen.getByRole("table", { name: "Ocupación por aula" }),
    ).getAllByRole("row");
    expect(aula).toHaveTextContent("Aula 12Edificio A1.º piso4 h99 h4%");
    expect(baja).toHaveTextContent("Aula 1 (dada de baja)");
  });

  it("cada asignación muestra fecha y hora, aula, materia, franja, origen y usuario", () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    const [, fila] = within(screen.getByRole("table", { name: "Asignaciones" })).getAllByRole(
      "row",
    );
    expect(fila).toHaveTextContent("14/10/2026 12:30");
    expect(fila).toHaveTextContent("Aula 12");
    expect(fila).toHaveTextContent("Proyecto Final · 5K2");
    expect(fila).toHaveTextContent("16/10/2026 19:00 a 23:00");
    expect(fila).toHaveTextContent("Asignación de bedelía");
    expect(fila).toHaveTextContent("Rosa Benítez");
  });

  it("sin clases ni asignaciones dice Sin registros para el período", () => {
    state.usoAulas = { ...usoAulasConDatos, clasesDelPeriodo: 0, total: 0, asignaciones: [] };
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    expect(screen.getByText("Sin registros para el período")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("un rango invertido muestra el error y no consulta", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    const inicial = state.consultasUsoAulas.at(-1);
    await userEvent.clear(screen.getByLabelText("Desde"));
    await userEvent.type(screen.getByLabelText("Desde"), "2999-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).toBeVisible();
    expect(state.consultasUsoAulas.at(-1)).toBe(inicial);
  });

  it("envía el origen y el aula elegidos y pagina", async () => {
    renderWithProviders(<ConsultasHistoricas perfil="BEDEL" />);
    await userEvent.selectOptions(screen.getByLabelText("Origen"), "CAMBIO_AULA");
    await userEvent.selectOptions(screen.getByLabelText("Aula"), "a1");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(state.consultasUsoAulas.at(-1)).toMatchObject({
      origen: "CAMBIO_AULA",
      aulaId: "a1",
      pagina: 1,
    });
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(state.consultasUsoAulas.at(-1)).toMatchObject({ origen: "CAMBIO_AULA", pagina: 2 });
  });
});
