import { describe, expect, it } from "vitest";

import {
  cambiarEstadoIncidenciaSchema,
  crearIncidenciaSchema,
  fotoMaxBytes,
  puedeAvanzarIncidencia,
  siguienteEstadoIncidencia,
  subirFotoIncidenciaSchema,
  validarFotoIncidencia,
} from "./incidencias";

const mensajes = (resultado: { error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((issue) => issue.message);

describe("crearIncidenciaSchema", () => {
  it("pide el elemento y la descripción", () => {
    const resultado = crearIncidenciaSchema.safeParse({ aulaId: "a1", descripcion: "  " });
    expect(mensajes(resultado)).toEqual(["Elegí el elemento afectado", "Ingresá una descripción"]);
  });

  it("limita la descripción a 500 caracteres", () => {
    const resultado = crearIncidenciaSchema.safeParse({
      aulaId: "a1",
      elemento: "OTRO",
      descripcion: "x".repeat(501),
    });
    expect(mensajes(resultado)).toEqual(["La descripción admite hasta 500 caracteres"]);
  });

  it("la gravedad por defecto es Leve", () => {
    const resultado = crearIncidenciaSchema.parse({
      aulaId: "a1",
      elemento: "PROYECTOR",
      descripcion: " No enciende ",
    });
    expect(resultado).toMatchObject({ gravedad: "LEVE", descripcion: "No enciende" });
  });
});

describe("validarFotoIncidencia", () => {
  it("acepta JPG y PNG de hasta 5 MB", () => {
    expect(validarFotoIncidencia({ type: "image/jpeg", size: fotoMaxBytes })).toBeNull();
    expect(validarFotoIncidencia({ type: "image/png", size: 10 })).toBeNull();
  });

  it("rechaza otros formatos antes que el peso", () => {
    expect(validarFotoIncidencia({ type: "application/pdf", size: fotoMaxBytes + 1 })).toBe(
      "La foto debe ser JPG o PNG",
    );
  });

  it("rechaza más de 5 MB", () => {
    expect(validarFotoIncidencia({ type: "image/jpeg", size: fotoMaxBytes + 1 })).toBe(
      "La foto no puede superar los 5 MB",
    );
  });

  it("el pedido de subida admite hasta 1 MB comprimida", () => {
    expect(
      subirFotoIncidenciaSchema.safeParse({ contentType: "image/jpeg", size: 1024 * 1024 }).success,
    ).toBe(true);
    expect(
      subirFotoIncidenciaSchema.safeParse({ contentType: "image/jpeg", size: 1024 * 1024 + 1 })
        .success,
    ).toBe(false);
    expect(
      subirFotoIncidenciaSchema.safeParse({ contentType: "application/pdf", size: 10 }).success,
    ).toBe(false);
  });
});

describe("estados", () => {
  it("avanza Abierta, En curso y Resuelta sin retroceder ni saltear", () => {
    expect(siguienteEstadoIncidencia("ABIERTA")).toBe("EN_CURSO");
    expect(siguienteEstadoIncidencia("RESUELTA")).toBeNull();
    expect(puedeAvanzarIncidencia("ABIERTA", "EN_CURSO")).toBe(true);
    expect(puedeAvanzarIncidencia("ABIERTA", "RESUELTA")).toBe(false);
    expect(puedeAvanzarIncidencia("EN_CURSO", "ABIERTA")).toBe(false);
    expect(puedeAvanzarIncidencia("RESUELTA", "RESUELTA")).toBe(false);
  });

  it("las observaciones admiten hasta 500 caracteres", () => {
    expect(
      cambiarEstadoIncidenciaSchema.safeParse({
        estado: "EN_CURSO",
        observaciones: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      cambiarEstadoIncidenciaSchema.parse({ estado: "EN_CURSO", observaciones: "" }),
    ).toMatchObject({
      observaciones: null,
      rehabilitarAula: false,
    });
  });
});
