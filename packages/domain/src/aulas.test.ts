import { describe, expect, it } from "vitest";

import { actualizarAulaSchema, crearAulaSchema } from "./aulas";

const valida = { codigo: "Aula 99", edificio: "Edificio A", piso: "PB", capacidad: "35" };

describe("crearAulaSchema", () => {
  it("acepta los obligatorios y completa estado y equipamiento", () => {
    expect(crearAulaSchema.parse(valida)).toEqual({
      codigo: "Aula 99",
      edificio: "Edificio A",
      piso: "PB",
      capacidad: 35,
      equipamiento: [],
      estado: "DISPONIBLE",
    });
  });

  it("rechaza capacidad fuera de 1 a 500 o no entera", () => {
    for (const capacidad of ["0", "501", "2.5", ""]) {
      expect(crearAulaSchema.safeParse({ ...valida, capacidad }).success).toBe(false);
    }
    for (const capacidad of ["1", "500"]) {
      expect(crearAulaSchema.safeParse({ ...valida, capacidad }).success).toBe(true);
    }
  });

  it("rechaza obligatorios vacíos con el campo en el error", () => {
    for (const campo of ["codigo", "edificio", "piso"] as const) {
      const resultado = crearAulaSchema.safeParse({ ...valida, [campo]: "  " });
      expect(resultado.success ? [] : resultado.error.issues[0]?.path).toEqual([campo]);
    }
  });

  it("limita las observaciones a 500 caracteres y rechaza equipamiento desconocido", () => {
    expect(crearAulaSchema.safeParse({ ...valida, observaciones: "a".repeat(501) }).success).toBe(
      false,
    );
    expect(crearAulaSchema.safeParse({ ...valida, equipamiento: ["Tele"] }).success).toBe(false);
    expect(crearAulaSchema.safeParse({ ...valida, estado: "OCUPADA" }).success).toBe(false);
  });
});

describe("actualizarAulaSchema", () => {
  it("permite cambiar un solo campo pero valida el que llega", () => {
    expect(actualizarAulaSchema.parse({ estado: "EN_MANTENIMIENTO" })).toEqual({
      estado: "EN_MANTENIMIENTO",
    });
    expect(actualizarAulaSchema.safeParse({ capacidad: 501 }).success).toBe(false);
  });
});
