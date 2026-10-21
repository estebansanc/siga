import { describe, expect, it } from "vitest";

import { updateSettingsSchema } from "./settings";
import { turnosIniciales } from "./turnos";

describe("updateSettingsSchema", () => {
  it("permite omitir el nombre", () => {
    expect(updateSettingsSchema.parse({})).toEqual({});
  });

  it("recorta espacios del nombre y acepta hasta 100 caracteres", () => {
    expect(updateSettingsSchema.parse({ name: "  Organización QA  " })).toEqual({
      name: "Organización QA",
    });
    expect(updateSettingsSchema.safeParse({ name: "a".repeat(100) }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });

  it("rechaza un nombre vacío o de solo espacios", () => {
    expect(updateSettingsSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("updateSettingsSchema.turnos", () => {
  it("acepta turnos válidos y rechaza los superpuestos", () => {
    expect(updateSettingsSchema.safeParse({ turnos: turnosIniciales }).success).toBe(true);
    expect(
      updateSettingsSchema.safeParse({
        turnos: { ...turnosIniciales, TARDE: { inicio: "12:00", fin: "18:00" } },
      }).success,
    ).toBe(false);
  });
});
