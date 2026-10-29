import { describe, expect, it } from "vitest";

import { aceptarPoliticaSchema, parrafosDeLaPolitica } from "./politica-privacidad";

describe("párrafos", () => {
  it("separa por líneas en blanco y descarta los vacíos", () => {
    expect(parrafosDeLaPolitica("Uno\n\n  Dos  \n\n\nTres\n")).toEqual(["Uno", "Dos", "Tres"]);
  });
});

describe("aceptar política", () => {
  it("pide una versión entera positiva", () => {
    expect(aceptarPoliticaSchema.safeParse({ version: 1 }).success).toBe(true);
    expect(aceptarPoliticaSchema.safeParse({ version: 0 }).success).toBe(false);
  });
});
