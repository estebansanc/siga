import { describe, expect, it } from "vitest";

import { listarClasesQuerySchema } from "./clases";

describe("listarClasesQuerySchema", () => {
  it("asume el ámbito 'mias' y convierte el año que llega como texto", () => {
    expect(listarClasesQuerySchema.parse({ anio: "5" })).toEqual({ ambito: "mias", anio: 5 });
  });

  it("rechaza fechas y años inválidos", () => {
    expect(listarClasesQuerySchema.safeParse({ fecha: "14/10/2026" }).success).toBe(false);
    expect(listarClasesQuerySchema.safeParse({ anio: "7" }).success).toBe(false);
  });
});
