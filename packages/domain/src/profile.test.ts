import { describe, expect, it } from "vitest";

import { solicitarBajaSchema, updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("recorta espacios y acepta hasta 120 caracteres", () => {
    expect(updateProfileSchema.parse({ name: "  Ana Pérez  " })).toEqual({ name: "Ana Pérez" });
    expect(updateProfileSchema.safeParse({ name: "a".repeat(120) }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ name: "a".repeat(121) }).success).toBe(false);
  });

  it("rechaza un nombre vacío o de solo espacios con su mensaje", () => {
    const result = updateProfileSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      "Ingresá apellido y nombre",
    );
  });
});

describe("updateProfileSchema con DNI y legajo", () => {
  it("valida el DNI como en el alta: 7 u 8 dígitos", () => {
    expect(updateProfileSchema.safeParse({ name: "Ana", dni: "1234567" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ name: "Ana", dni: "12345678" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ name: "Ana", dni: "123456" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: "Ana", dni: "123456789" }).success).toBe(false);
  });

  it("el legajo es opcional, se recorta y un vacío queda en null", () => {
    expect(updateProfileSchema.parse({ name: "Ana", legajo: "  L-1 " }).legajo).toBe("L-1");
    expect(updateProfileSchema.parse({ name: "Ana", legajo: "" }).legajo).toBeNull();
    expect(updateProfileSchema.safeParse({ name: "Ana", legajo: "a".repeat(21) }).success).toBe(
      false,
    );
  });
});

describe("solicitarBajaSchema", () => {
  it("el motivo es opcional y admite hasta 500 caracteres", () => {
    expect(solicitarBajaSchema.parse({}).motivo).toBeUndefined();
    expect(solicitarBajaSchema.parse({ motivo: "  " }).motivo).toBeNull();
    expect(solicitarBajaSchema.safeParse({ motivo: "a".repeat(500) }).success).toBe(true);
    expect(solicitarBajaSchema.safeParse({ motivo: "a".repeat(501) }).success).toBe(false);
  });
});
