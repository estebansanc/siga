import { describe, expect, it } from "vitest";

import {
  archivoPlanoMaxBytes,
  esArchivoPlanoValido,
  esAulaDudosa,
  rectanguloDeAula,
} from "./deteccion-aulas";

describe("esArchivoPlanoValido", () => {
  it("acepta PDF, PNG y JPG de hasta 20 MB", () => {
    for (const type of ["application/pdf", "image/png", "image/jpeg"]) {
      expect(esArchivoPlanoValido({ type, size: archivoPlanoMaxBytes })).toBe(true);
    }
  });

  it("rechaza otros tipos y archivos vacíos o de más de 20 MB", () => {
    expect(esArchivoPlanoValido({ type: "image/gif", size: 10 })).toBe(false);
    expect(esArchivoPlanoValido({ type: "application/pdf", size: archivoPlanoMaxBytes + 1 })).toBe(
      false,
    );
    expect(esArchivoPlanoValido({ type: "image/png", size: 0 })).toBe(false);
  });
});

describe("esAulaDudosa", () => {
  it("es dudosa con confianza menor a 0,5 o sin nombre", () => {
    expect(esAulaDudosa({ nombre: "Aula 21", confianza: 0.49 })).toBe(true);
    expect(esAulaDudosa({ nombre: null, confianza: 0.9 })).toBe(true);
    expect(esAulaDudosa({ nombre: "Aula 21", confianza: 0.5 })).toBe(false);
  });
});

describe("rectanguloDeAula", () => {
  it("centra el rectángulo en el punto", () => {
    const [a, , c] = rectanguloDeAula({ x: 0.5, y: 0.5 }, 0.2);
    expect(a).toEqual({ x: 0.4, y: 0.4 });
    expect(c!.x).toBeCloseTo(0.6);
    expect(c!.y).toBeCloseTo(0.6);
  });

  it("no se sale de la imagen", () => {
    const puntos = rectanguloDeAula({ x: 0.99, y: 0.01 });
    expect(puntos.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)).toBe(true);
  });
});
