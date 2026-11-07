import type { AulaGestionDto } from "@repo/api/client";
import { describe, expect, it } from "vitest";

import {
  aulaDesdeDeteccion,
  aulaDibujada,
  errorDeCapacidad,
  evaluarNombres,
  type AulaEditable,
} from "@/components/aulas/importar-plano/aulas-editables";

const poligono = [
  { x: 0.1, y: 0.1 },
  { x: 0.3, y: 0.1 },
  { x: 0.3, y: 0.3 },
];

const existente = (datos: Partial<AulaGestionDto>): AulaGestionDto => ({
  id: "a1",
  codigo: "Aula 21",
  edificio: "Edificio A",
  piso: "2.º piso",
  capacidad: 30,
  equipamiento: [],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
  ...datos,
});

const aula = (id: string, nombre: string): AulaEditable => ({
  ...aulaDibujada(id, poligono),
  nombre,
});

const destino = { edificio: "Edificio A", piso: "2.º piso" };

describe("aulaDesdeDeteccion", () => {
  it("tilda las de confianza suficiente con nombre", () => {
    const resultado = aulaDesdeDeteccion({ nombre: "Aula 21", confianza: 0.5, poligono }, 0);
    expect(resultado).toMatchObject({ nombre: "Aula 21", tildada: true, dudosa: false });
  });

  it("destilda y marca dudosa la de baja confianza o sin nombre", () => {
    expect(aulaDesdeDeteccion({ nombre: "Aula 21", confianza: 0.49, poligono }, 0)).toMatchObject({
      tildada: false,
      dudosa: true,
    });
    expect(aulaDesdeDeteccion({ nombre: null, confianza: 0.95, poligono }, 1)).toMatchObject({
      nombre: "",
      tildada: false,
      dudosa: true,
    });
  });
});

describe("evaluarNombres", () => {
  it("pide el nombre vacío", () => {
    expect(evaluarNombres([aula("a", "  ")], [], destino).get("a")?.error).toBe(
      "Ingresá el nombre",
    );
  });

  it("marca los nombres repetidos dentro del plano", () => {
    const estados = evaluarNombres([aula("a", "Aula 1"), aula("b", "Aula 1")], [], destino);
    expect(estados.get("a")?.error).toBe("Nombre repetido en el plano");
    expect(estados.get("b")?.error).toBe("Nombre repetido en el plano");
  });

  it("uno activo del mismo piso se ubicará y no es error", () => {
    expect(evaluarNombres([aula("a", "Aula 21")], [existente({})], destino).get("a")).toEqual({
      error: null,
      ubicara: true,
    });
  });

  it("uno de otro piso o edificio, o dado de baja, es error", () => {
    const otroPiso = existente({ piso: "PB" });
    const baja = existente({ activa: false });
    expect(evaluarNombres([aula("a", "Aula 21")], [otroPiso], destino).get("a")?.error).toBe(
      "Ya existe en otro edificio o piso",
    );
    expect(evaluarNombres([aula("a", "Aula 21")], [baja], destino).get("a")?.error).toBe(
      "Está dada de baja",
    );
  });
});

describe("errorDeCapacidad", () => {
  it("la capacidad por defecto es obligatoria y la propia opcional", () => {
    expect(errorDeCapacidad("", true)).toBe("Ingresá la capacidad por defecto");
    expect(errorDeCapacidad("", false)).toBeNull();
  });

  it("valida el rango", () => {
    expect(errorDeCapacidad("40", true)).toBeNull();
    expect(errorDeCapacidad("0", false)).not.toBeNull();
    expect(errorDeCapacidad("4.5", false)).not.toBeNull();
  });
});
