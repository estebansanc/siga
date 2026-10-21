import { describe, expect, it } from "vitest";

import { actualizarPreferenciasSchema, buscarComisionesQuerySchema } from "./preferencias";

describe("preferencias", () => {
  it("acepta una lista vacía de comisiones y rechaza ids vacíos", () => {
    expect(actualizarPreferenciasSchema.parse({ comisionIds: [] })).toEqual({ comisionIds: [] });
    expect(actualizarPreferenciasSchema.safeParse({ comisionIds: [""] }).success).toBe(false);
  });

  it("convierte el año de la búsqueda de comisiones", () => {
    expect(buscarComisionesQuerySchema.parse({ carreraId: "k", anio: "4" })).toEqual({
      carreraId: "k",
      anio: 4,
    });
  });
});
