import { describe, expect, it } from "vitest";

import { cambiarEstadoInstitucionalSchema } from "./estado-institucional";

describe("cambiarEstadoInstitucionalSchema", () => {
  it("Abierta no necesita motivo", () => {
    expect(cambiarEstadoInstitucionalSchema.parse({ estado: "ABIERTA" })).toEqual({
      estado: "ABIERTA",
    });
  });

  it("Cerrada y Abierta con novedades exigen motivo de hasta 280 caracteres", () => {
    for (const estado of ["CERRADA", "ABIERTA_CON_NOVEDADES"]) {
      const sinMotivo = cambiarEstadoInstitucionalSchema.safeParse({ estado, motivo: " " });
      expect(sinMotivo.success).toBe(false);
      expect(sinMotivo.success ? [] : sinMotivo.error.issues[0]?.path).toEqual(["motivo"]);
    }
    expect(
      cambiarEstadoInstitucionalSchema.safeParse({ estado: "CERRADA", motivo: "a".repeat(281) })
        .success,
    ).toBe(false);
  });

  it("acepta la vigencia como fecha y hora ISO con desfase, o vacía", () => {
    expect(
      cambiarEstadoInstitucionalSchema.parse({
        estado: "CERRADA",
        motivo: "Paro",
        vigenciaHasta: "2026-10-14T23:30:00-03:00",
      }).vigenciaHasta,
    ).toBe("2026-10-14T23:30:00-03:00");
    expect(
      cambiarEstadoInstitucionalSchema.parse({
        estado: "CERRADA",
        motivo: "Paro",
        vigenciaHasta: "",
      }).vigenciaHasta,
    ).toBeNull();
    expect(
      cambiarEstadoInstitucionalSchema.safeParse({
        estado: "CERRADA",
        motivo: "Paro",
        vigenciaHasta: "mañana",
      }).success,
    ).toBe(false);
  });
});
