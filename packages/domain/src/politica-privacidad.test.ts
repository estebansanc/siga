import { describe, expect, it } from "vitest";

import {
  aceptacionPendiente,
  aceptarPoliticaSchema,
  parrafosDeLaPolitica,
  versionVigente,
} from "./politica-privacidad";

describe("versión vigente", () => {
  it("es la de número más alto", () => {
    expect(versionVigente([1, 3, 2])).toBe(3);
  });

  it("no hay vigente sin versiones", () => {
    expect(versionVigente([])).toBeNull();
  });
});

describe("aceptación pendiente", () => {
  it("está pendiente si no se aceptó ninguna", () => {
    expect(aceptacionPendiente([1], [])).toBe(true);
  });

  it("no está pendiente si se aceptó la vigente", () => {
    expect(aceptacionPendiente([1, 2], [1, 2])).toBe(false);
  });

  it("vuelve a estar pendiente si solo se aceptó una anterior", () => {
    expect(aceptacionPendiente([1, 2], [1])).toBe(true);
  });

  it("no pide nada si no hay política publicada", () => {
    expect(aceptacionPendiente([], [])).toBe(false);
  });
});

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
