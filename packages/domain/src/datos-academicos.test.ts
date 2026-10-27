import { describe, expect, it } from "vitest";

import {
  actualizarHorarioSchema,
  crearCarreraSchema,
  crearComisionSchema,
  crearDiaNoLaborableSchema,
  crearHorarioSchema,
  crearMateriaSchema,
  crearPeriodoSchema,
  nombreDiaSemana,
} from "./datos-academicos";

const campoConError = (resultado: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}) => resultado.error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("carrera y materia", () => {
  it("recortan espacios y exigen código y nombre", () => {
    expect(crearCarreraSchema.parse({ codigo: " K ", nombre: " Sistemas " })).toEqual({
      codigo: "K",
      nombre: "Sistemas",
    });
    expect(campoConError(crearCarreraSchema.safeParse({ codigo: " ", nombre: "" }))).toEqual([
      "codigo",
      "nombre",
    ]);
  });

  it("la materia pide un año entre 1 y 6", () => {
    const base = { carreraId: "c1", codigo: "K5", nombre: "Proyecto Final" };
    expect(crearMateriaSchema.parse({ ...base, anioCarrera: "5" }).anioCarrera).toBe(5);
    expect(crearMateriaSchema.safeParse({ ...base, anioCarrera: "7" }).success).toBe(false);
    expect(crearMateriaSchema.safeParse({ ...base, carreraId: "", anioCarrera: 1 }).success).toBe(
      false,
    );
  });
});

describe("período", () => {
  it("rechaza un fin que no es posterior al inicio, en el campo de fin", () => {
    const base = { nombre: "1.er cuatrimestre" };
    for (const [fechaInicio, fechaFin] of [
      ["2026-08-10", "2026-08-10"],
      ["2026-08-10", "2026-08-01"],
    ]) {
      const resultado = crearPeriodoSchema.safeParse({ ...base, fechaInicio, fechaFin });
      expect(campoConError(resultado)).toEqual(["fechaFin"]);
    }
    expect(
      crearPeriodoSchema.safeParse({ ...base, fechaInicio: "2026-08-10", fechaFin: "2026-08-11" })
        .success,
    ).toBe(true);
  });
});

describe("horario", () => {
  const base = { comisionId: "c1", diaSemana: "1", horaInicio: "19:00", horaFin: "21:00" };

  it("acepta aula vacía como sin aula habitual", () => {
    expect(crearHorarioSchema.parse({ ...base, aulaHabitualId: "" }).aulaHabitualId).toBeNull();
  });

  it("rechaza un fin no posterior al inicio, en el campo de fin", () => {
    expect(campoConError(crearHorarioSchema.safeParse({ ...base, horaFin: "19:00" }))).toEqual([
      "horaFin",
    ]);
    expect(campoConError(crearHorarioSchema.safeParse({ ...base, horaFin: "18:59" }))).toEqual([
      "horaFin",
    ]);
  });

  it("acepta de lunes (1) a domingo (7) y rechaza el resto", () => {
    expect(crearHorarioSchema.safeParse({ ...base, diaSemana: "7" }).success).toBe(true);
    expect(crearHorarioSchema.safeParse({ ...base, diaSemana: "8" }).success).toBe(false);
    expect(crearHorarioSchema.safeParse({ ...base, horaInicio: "7:00" }).success).toBe(false);
  });

  it("la edición no permite cambiar la comisión", () => {
    expect(actualizarHorarioSchema.parse({ comisionId: "otra", horaFin: "22:00" })).toEqual({
      horaFin: "22:00",
    });
  });
});

describe("comisión y día no laborable", () => {
  it("la comisión admite cero docentes", () => {
    const comision = crearComisionSchema.parse({
      materiaId: "m1",
      periodoLectivoId: "p1",
      codigo: "5K2",
      turno: "NOCHE",
    });
    expect(comision.docenteIds).toEqual([]);
  });

  it("el día no laborable pide fecha válida y motivo", () => {
    expect(crearDiaNoLaborableSchema.safeParse({ fecha: "2026-13-40", motivo: "x" }).success).toBe(
      false,
    );
    expect(crearDiaNoLaborableSchema.safeParse({ fecha: "2026-10-12", motivo: " " }).success).toBe(
      false,
    );
  });

  it("nombra los días de la semana", () => {
    expect(nombreDiaSemana(1)).toBe("Lunes");
    expect(nombreDiaSemana(7)).toBe("Domingo");
  });
});
