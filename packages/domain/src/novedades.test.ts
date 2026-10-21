import { describe, expect, it } from "vitest";

import { publicarNovedadSchema } from "./novedades";

const base = { claseIds: ["clase-1"] };

const pathsDe = (input: unknown) => {
  const result = publicarNovedadSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("publicarNovedadSchema", () => {
  it("exige al menos una clase", () => {
    expect(pathsDe({ claseIds: [], tipo: "AUSENCIA" })).toEqual(["claseIds"]);
  });

  it("Ausencia y Suspensión no piden datos extra y limpian el mensaje vacío", () => {
    expect(publicarNovedadSchema.parse({ ...base, tipo: "AUSENCIA", mensaje: "  " })).toEqual({
      claseIds: ["clase-1"],
      tipo: "AUSENCIA",
      mensaje: null,
    });
    expect(pathsDe({ ...base, tipo: "SUSPENSION" })).toEqual([]);
  });

  it("Demora exige minutos enteros entre 1 y 240 y los acepta como texto", () => {
    expect(pathsDe({ ...base, tipo: "DEMORA" })).toEqual(["minutosDemora"]);
    expect(pathsDe({ ...base, tipo: "DEMORA", minutosDemora: "" })).toEqual(["minutosDemora"]);
    expect(pathsDe({ ...base, tipo: "DEMORA", minutosDemora: "300" })).toEqual(["minutosDemora"]);
    expect(
      publicarNovedadSchema.parse({ ...base, tipo: "DEMORA", minutosDemora: "15" }),
    ).toMatchObject({ minutosDemora: 15 });
  });

  it("Virtual exige un enlace http(s)", () => {
    expect(pathsDe({ ...base, tipo: "VIRTUAL", enlaceVirtual: "" })).toEqual(["enlaceVirtual"]);
    expect(pathsDe({ ...base, tipo: "VIRTUAL", enlaceVirtual: "meet" })).toEqual(["enlaceVirtual"]);
    expect(
      pathsDe({ ...base, tipo: "VIRTUAL", enlaceVirtual: "https://meet.google.com/abc" }),
    ).toEqual([]);
  });

  it("Cambio de aula exige el aula nueva", () => {
    expect(pathsDe({ ...base, tipo: "CAMBIO_AULA" })).toEqual(["aulaNuevaId"]);
    expect(pathsDe({ ...base, tipo: "CAMBIO_AULA", aulaNuevaId: "aula-7" })).toEqual([]);
  });

  it("limita el mensaje a 500 caracteres", () => {
    expect(pathsDe({ ...base, tipo: "AUSENCIA", mensaje: "a".repeat(501) })).toEqual(["mensaje"]);
  });
});
