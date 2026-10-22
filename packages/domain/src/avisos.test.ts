import { describe, expect, it } from "vitest";

import { avisoAlcanza, crearAvisoSchema, segmentoVacio, type SegmentoAviso } from "./avisos";

const enMinutos = (minutos: number) => new Date(Date.now() + minutos * 60_000).toISOString();

const valido = {
  titulo: "Corte de luz",
  cuerpo: "Hoy no hay clases",
  destinatarios: { ...segmentoVacio, todos: true },
  hasta: enMinutos(60),
};

const mensajesDe = (input: unknown) => {
  const result = crearAvisoSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("crearAvisoSchema", () => {
  it("acepta un aviso mínimo con prioridad Normal y sin correo", () => {
    expect(crearAvisoSchema.parse(valido)).toMatchObject({
      prioridad: "NORMAL",
      enviarPorCorreo: false,
    });
  });

  it("rechaza título, cuerpo y hasta vacíos con los textos del producto", () => {
    expect(mensajesDe({ ...valido, titulo: "  ", cuerpo: "", hasta: "" })).toEqual([
      "titulo: Ingresá el título",
      "cuerpo: Ingresá el cuerpo del aviso",
      "hasta: Indicá hasta cuándo está vigente",
    ]);
  });

  it("limita el título a 100 y el cuerpo a 2.000 caracteres", () => {
    expect(mensajesDe({ ...valido, titulo: "a".repeat(101) })).toHaveLength(1);
    expect(mensajesDe({ ...valido, titulo: "a".repeat(100) })).toEqual([]);
    expect(mensajesDe({ ...valido, cuerpo: "a".repeat(2001) })).toHaveLength(1);
    expect(mensajesDe({ ...valido, cuerpo: "a".repeat(2000) })).toEqual([]);
  });

  it("pide al menos un destinatario si no es para todos", () => {
    expect(mensajesDe({ ...valido, destinatarios: segmentoVacio })).toEqual([
      "destinatarios: Elegí al menos un destinatario",
    ]);
    expect(
      mensajesDe({ ...valido, destinatarios: { ...segmentoVacio, perfiles: ["BEDEL"] } }),
    ).toEqual([]);
  });

  it("si la vigencia ya terminó prioriza el error de futuro sobre el de orden", () => {
    expect(mensajesDe({ ...valido, hasta: enMinutos(-60) })).toEqual([
      "hasta: La vigencia tiene que terminar en el futuro",
    ]);
  });

  it("exige que la vigencia termine después de empezar", () => {
    expect(mensajesDe({ ...valido, desde: enMinutos(24 * 60), hasta: enMinutos(23 * 60) })).toEqual(
      ["hasta: La vigencia tiene que terminar después de empezar"],
    );
    expect(mensajesDe({ ...valido, desde: enMinutos(24 * 60), hasta: enMinutos(25 * 60) })).toEqual(
      [],
    );
  });

  it("un desde vacío cuenta como ahora", () => {
    expect(crearAvisoSchema.parse({ ...valido, desde: "" }).desde).toBeUndefined();
  });
});

describe("avisoAlcanza", () => {
  const estudiante = {
    perfil: "ESTUDIANTE" as const,
    comisiones: [{ id: "c1", carreraId: "isi", anio: 5 }],
  };
  const segmento = (parcial: Partial<SegmentoAviso>): SegmentoAviso => ({
    ...segmentoVacio,
    ...parcial,
  });

  it("todos alcanza a cualquiera", () => {
    expect(avisoAlcanza(segmento({ todos: true }), { perfil: "BEDEL", comisiones: [] })).toBe(true);
  });

  it("un segmento vacío no alcanza a nadie", () => {
    expect(avisoAlcanza(segmentoVacio, estudiante)).toBe(false);
  });

  it("alcanza por perfil, comisión, carrera o año de sus comisiones", () => {
    expect(avisoAlcanza(segmento({ perfiles: ["ESTUDIANTE"] }), estudiante)).toBe(true);
    expect(avisoAlcanza(segmento({ comisionIds: ["c1"] }), estudiante)).toBe(true);
    expect(avisoAlcanza(segmento({ carreraIds: ["isi"] }), estudiante)).toBe(true);
    expect(avisoAlcanza(segmento({ anios: [5] }), estudiante)).toBe(true);
  });

  it("no alcanza a quien no tiene comisiones que coincidan", () => {
    expect(avisoAlcanza(segmento({ perfiles: ["DOCENTE"] }), estudiante)).toBe(false);
    expect(
      avisoAlcanza(segmento({ comisionIds: ["c2"], carreraIds: ["iq"], anios: [1] }), estudiante),
    ).toBe(false);
    expect(avisoAlcanza(segmento({ anios: [5] }), { perfil: "BEDEL", comisiones: [] })).toBe(false);
  });
});
