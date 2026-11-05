import { describe, expect, it } from "vitest";

import {
  centroideDePoligono,
  codigosRepetidos,
  importarAulasPlanoSchema,
  poligonoSchema,
} from "./planos";

const cuadrado = [
  { x: 0.2, y: 0.2 },
  { x: 0.4, y: 0.2 },
  { x: 0.4, y: 0.4 },
  { x: 0.2, y: 0.4 },
];

describe("poligonoSchema", () => {
  it("acepta de 3 a 24 puntos", () => {
    expect(poligonoSchema.safeParse(cuadrado.slice(0, 3)).success).toBe(true);
    expect(poligonoSchema.safeParse(Array(24).fill(cuadrado[0])).success).toBe(true);
  });

  it("rechaza menos de 3, más de 24 o coordenadas fuera de 0 a 1", () => {
    expect(poligonoSchema.safeParse(cuadrado.slice(0, 2)).success).toBe(false);
    expect(poligonoSchema.safeParse(Array(25).fill(cuadrado[0])).success).toBe(false);
    expect(poligonoSchema.safeParse([...cuadrado, { x: 1.1, y: 0 }]).success).toBe(false);
  });
});

describe("centroideDePoligono", () => {
  it("devuelve el centro de un rectángulo", () => {
    const centro = centroideDePoligono(cuadrado);
    expect(centro.x).toBeCloseTo(0.3);
    expect(centro.y).toBeCloseTo(0.3);
  });

  it("promedia los vértices si el polígono no tiene área", () => {
    const linea = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ];
    expect(centroideDePoligono(linea)).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("códigos repetidos", () => {
  it("lista cada código repetido una vez", () => {
    expect(codigosRepetidos(["A", "B", "A", "A", "C", "B"])).toEqual(["A", "B"]);
  });

  it("la importación rechaza códigos repetidos y capacidad inválida", () => {
    const aula = { codigo: "Aula 1", poligono: cuadrado };
    expect(
      importarAulasPlanoSchema.safeParse({ capacidadPorDefecto: 30, aulas: [aula, aula] }).success,
    ).toBe(false);
    expect(
      importarAulasPlanoSchema.safeParse({ capacidadPorDefecto: 0, aulas: [aula] }).success,
    ).toBe(false);
    expect(
      importarAulasPlanoSchema.safeParse({ capacidadPorDefecto: 30, aulas: [aula] }).success,
    ).toBe(true);
  });
});
