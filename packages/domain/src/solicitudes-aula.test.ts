import { describe, expect, it } from "vitest";

import {
  alumnosSolicitudSchema,
  criteriosQueFallan,
  crearSolicitudAulaSchema,
  esAsignacionInmediata,
  mensajeAlumnosInvalidos,
} from "./solicitudes-aula";

describe("alumnosSolicitudSchema", () => {
  it.each(["", "0", "-3", "2.5", "abc", undefined])("rechaza %j", (valor) => {
    const resultado = alumnosSolicitudSchema.safeParse(valor);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(mensajeAlumnosInvalidos);
  });

  it("acepta un entero mayor que 0, también como texto", () => {
    expect(alumnosSolicitudSchema.parse("40")).toBe(40);
  });
});

describe("crearSolicitudAulaSchema", () => {
  const base = { claseId: "c1", aulaId: "a1", alumnos: 30 };

  it("normaliza recursos y comentario vacíos", () => {
    expect(crearSolicitudAulaSchema.parse({ ...base, comentario: "  " })).toMatchObject({
      recursos: [],
      comentario: null,
    });
  });

  it("limita el comentario a 500 caracteres y los recursos al catálogo", () => {
    expect(
      crearSolicitudAulaSchema.safeParse({ ...base, comentario: "x".repeat(501) }).success,
    ).toBe(false);
    expect(crearSolicitudAulaSchema.safeParse({ ...base, recursos: ["Jacuzzi"] }).success).toBe(
      false,
    );
  });
});

describe("criteriosQueFallan", () => {
  const aula = { capacidad: 30, equipamiento: ["Pizarra"] };

  it("no informa nada si cumple todo", () => {
    expect(criteriosQueFallan(aula, { alumnos: 30, recursos: ["Pizarra"] })).toEqual([]);
  });

  it("informa capacidad y cada recurso faltante en minúscula", () => {
    expect(
      criteriosQueFallan(aula, { alumnos: 100, recursos: ["Proyector", "Climatizacion"] }),
    ).toEqual(["Capacidad para 100 alumnos", "Sin proyector", "Sin climatización"]);
  });
});

describe("esAsignacionInmediata", () => {
  const ahora = new Date("2026-10-21T15:00:00Z");

  it("es inmediata con menos de 30 minutos o si ya empezó", () => {
    expect(esAsignacionInmediata(new Date("2026-10-21T15:29:00Z"), ahora)).toBe(true);
    expect(esAsignacionInmediata(new Date("2026-10-21T14:00:00Z"), ahora)).toBe(true);
  });

  it("no lo es a 30 minutos o más", () => {
    expect(esAsignacionInmediata(new Date("2026-10-21T15:30:00Z"), ahora)).toBe(false);
  });
});
