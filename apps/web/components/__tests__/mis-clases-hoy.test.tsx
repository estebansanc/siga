import type { ClaseDto, EstadoInstitucionalDto, PreferenciasDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MisClasesHoy } from "@/components/clases/mis-clases-hoy";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  preferencias: undefined as PreferenciasDto | undefined,
  clases: undefined as { fecha: string; clases: ClaseDto[] } | undefined,
  estado: undefined as EstadoInstitucionalDto | undefined,
}));

vi.mock("@/hooks/use-preferencias", () => ({
  usePreferencias: () => ({ data: state.preferencias }),
}));
vi.mock("@/hooks/use-clases", () => ({
  useClases: () => ({ data: state.clases }),
  useClase: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: state.estado }),
}));

const comision = {
  id: "c1",
  codigo: "5K2",
  turno: "NOCHE" as const,
  anioLectivo: 2026,
  materia: { id: "m1", codigo: "K5-PF", nombre: "Proyecto Final", anioCarrera: 5, carreraId: "k" },
  carrera: { id: "k", codigo: "K", nombre: "ISI" },
  docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
};

const clase: ClaseDto = {
  id: "clase-1",
  fecha: "2026-10-14",
  horaInicio: "19:00",
  horaFin: "23:00",
  inicio: "2026-10-14T22:00:00.000Z",
  fin: "2026-10-15T02:00:00.000Z",
  estado: "DEMORADA",
  modalidad: "PRESENCIAL",
  comision: { id: "c1", codigo: "5K2", turno: "NOCHE" },
  materia: comision.materia,
  carrera: comision.carrera,
  aula: { id: "a1", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" },
  docentes: comision.docentes,
  asistencia: null,
  novedades: [
    {
      id: "n1",
      tipo: "DEMORA",
      estado: "ACTIVA",
      minutosDemora: 15,
      enlaceVirtual: null,
      aulaNueva: null,
      mensaje: "Arranco 19:15, empiecen con la lectura del TP 4.",
      publicadaPorBedelia: false,
      createdAt: "2026-10-14T21:00:00.000Z",
    },
  ],
};

const abierta: EstadoInstitucionalDto = {
  id: "e1",
  estado: "ABIERTA",
  motivo: null,
  desde: "2026-10-14T10:30:00.000Z",
  vigenciaHasta: null,
  usuario: null,
};

const sinCorreo = { notificarNovedadesPorCorreo: false, notificarAvisosPorCorreo: false };

beforeEach(() => {
  state.preferencias = { ...sinCorreo, comisiones: [comision] };
  state.clases = { fecha: "2026-10-14", clases: [clase] };
  state.estado = abierta;
});

describe("MisClasesHoy", () => {
  it("muestra esqueletos hasta saber qué comisiones sigue", () => {
    state.preferencias = undefined;
    renderWithProviders(<MisClasesHoy />);
    expect(screen.getByLabelText("Cargando clases")).toBeInTheDocument();
  });

  it("sin comisiones seguidas invita a elegirlas", () => {
    state.preferencias = { ...sinCorreo, comisiones: [] };
    renderWithProviders(<MisClasesHoy />);
    expect(screen.getByText("Todavía no seguís ninguna comisión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elegir comisiones" })).toHaveAttribute(
      "href",
      "/preferencias",
    );
  });

  it("sin clases hoy lo dice", () => {
    state.clases = { fecha: "2026-10-14", clases: [] };
    renderWithProviders(<MisClasesHoy />);
    expect(screen.getByText("No tenés clases hoy")).toBeInTheDocument();
  });

  it("lista cada clase con materia, comisión, horario, aula, estado y la novedad activa", () => {
    renderWithProviders(<MisClasesHoy />);
    expect(screen.getByText("miércoles 14 de octubre")).toBeInTheDocument();
    expect(screen.getByText("1 clase · 5K2")).toBeInTheDocument();
    expect(screen.getByText("Proyecto Final")).toBeInTheDocument();
    expect(screen.getByText("19:00 – 23:00 · Aula 12, Edificio A, 1.º piso")).toBeInTheDocument();
    expect(screen.getByText("Demorada 15 min")).toBeInTheDocument();
    expect(screen.getByText("Demora de 15 min")).toBeInTheDocument();
    expect(
      screen.getByText("“Arranco 19:15, empiecen con la lectura del TP 4.”"),
    ).toBeInTheDocument();
  });

  it("con la institución cerrada muestra el aviso destacado con el motivo", () => {
    state.estado = { ...abierta, estado: "CERRADA", motivo: "Paro docente nacional" };
    renderWithProviders(<MisClasesHoy />);
    expect(screen.getByText("Institución cerrada")).toBeInTheDocument();
    expect(screen.getByText("Paro docente nacional")).toBeInTheDocument();
  });
});
