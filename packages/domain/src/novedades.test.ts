import { describe, expect, it } from "vitest";

import { editarNovedadSchemaPara, novedadActiva, publicarNovedadSchema } from "./novedades";

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

describe("editarNovedadSchemaPara", () => {
  it("exige el dato propio del tipo y acepta vaciar el mensaje", () => {
    expect(editarNovedadSchemaPara("DEMORA").safeParse({ mensaje: "" }).success).toBe(false);
    const demora = editarNovedadSchemaPara("DEMORA").parse({ minutosDemora: "25", mensaje: "" });
    expect(demora).toMatchObject({ minutosDemora: 25, mensaje: null });
    expect(editarNovedadSchemaPara("CAMBIO_AULA").safeParse({}).success).toBe(false);
  });

  it("rechaza un enlace inválido y los datos ajenos al tipo", () => {
    expect(editarNovedadSchemaPara("VIRTUAL").safeParse({ enlaceVirtual: "ftp://x" }).success).toBe(
      false,
    );
    expect(
      editarNovedadSchemaPara("AUSENCIA").safeParse({ minutosDemora: 5, mensaje: "x" }).success,
    ).toBe(false);
    expect(editarNovedadSchemaPara("SUSPENSION").safeParse({ mensaje: "x" }).success).toBe(true);
  });
});

describe("novedadActiva", () => {
  const ahora = new Date("2026-10-30T15:00:00Z");
  const clase = (estado: "PROGRAMADA" | "FINALIZADA" | "SUSPENDIDA", fin: string) => ({
    estado,
    fin: new Date(fin),
  });

  it("es activa con una clase en curso o futura", () => {
    const clases = [clase("PROGRAMADA", "2026-10-30T16:00:00Z")];
    expect(novedadActiva({ estado: "ACTIVA", clases }, ahora)).toBe(true);
  });

  it("pasa a Historial si está finalizada", () => {
    const clases = [clase("PROGRAMADA", "2026-10-30T16:00:00Z")];
    expect(novedadActiva({ estado: "FINALIZADA", clases }, ahora)).toBe(false);
  });

  it("pasa a Historial cuando no le quedan clases por delante", () => {
    const clases = [
      clase("SUSPENDIDA", "2026-10-30T14:00:00Z"),
      clase("FINALIZADA", "2026-10-31T14:00:00Z"),
    ];
    expect(novedadActiva({ estado: "ACTIVA", clases }, ahora)).toBe(false);
  });
});
