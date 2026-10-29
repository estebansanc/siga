import { describe, expect, it } from "vitest";

import {
  accionesDelPlano,
  compararCodigosAula,
  compararPisos,
  entraEnCapacidad,
  estadoPlanoDeAula,
  resolucionCorreoDeAula,
} from "./plano-aulas";

describe("estadoPlanoDeAula", () => {
  it("es Libre sin clase en curso", () => {
    expect(estadoPlanoDeAula("DISPONIBLE", null)).toBe("LIBRE");
  });

  it("es Pendiente con la clase Programada o Demorada, sin asistencia", () => {
    expect(estadoPlanoDeAula("DISPONIBLE", "PROGRAMADA")).toBe("PENDIENTE");
    expect(estadoPlanoDeAula("DISPONIBLE", "DEMORADA")).toBe("PENDIENTE");
  });

  it("es Ocupada con el docente presente", () => {
    expect(estadoPlanoDeAula("DISPONIBLE", "DOCENTE_PRESENTE")).toBe("OCUPADA");
  });

  it("el estado del aula fuera de servicio o en mantenimiento prevalece sobre la clase", () => {
    expect(estadoPlanoDeAula("FUERA_DE_SERVICIO", "DOCENTE_PRESENTE")).toBe("FUERA_DE_SERVICIO");
    expect(estadoPlanoDeAula("EN_MANTENIMIENTO", null)).toBe("EN_MANTENIMIENTO");
  });
});

describe("orden del plano", () => {
  it("ordena los códigos por número: Aula 3 antes que Aula 12", () => {
    expect(["Aula 12", "Aula 3", "Aula 7"].sort(compararCodigosAula)).toEqual([
      "Aula 3",
      "Aula 7",
      "Aula 12",
    ]);
  });

  it("ordena los pisos: PB, por número y el resto alfabético", () => {
    expect(
      ["Subsuelo", "2.º piso", "PB", "10.º piso", "1.º piso", "Anexo"].sort(compararPisos),
    ).toEqual(["PB", "1.º piso", "2.º piso", "10.º piso", "Anexo", "Subsuelo"]);
  });
});

describe("accionesDelPlano", () => {
  const libre = { estadoAula: "DISPONIBLE", conClaseEnCurso: false } as const;
  const conClase = { estadoAula: "DISPONIBLE", conClaseEnCurso: true } as const;

  it("Bedel y Autoridad asignan en un aula libre y mueven o reemplazan en una con clase", () => {
    for (const perfil of ["BEDEL", "AUTORIDAD"] as const) {
      expect(accionesDelPlano(perfil, libre)).toEqual(["ASIGNAR"]);
      expect(accionesDelPlano(perfil, conClase)).toEqual(["MOVER", "REEMPLAZAR"]);
    }
  });

  it("Docente y Estudiante no tienen acciones", () => {
    expect(accionesDelPlano("DOCENTE", conClase)).toEqual([]);
    expect(accionesDelPlano("ESTUDIANTE", libre)).toEqual([]);
  });

  it("un aula fuera de servicio solo se puede vaciar moviendo su clase", () => {
    const fuera = { estadoAula: "FUERA_DE_SERVICIO", conClaseEnCurso: true } as const;
    expect(accionesDelPlano("BEDEL", fuera)).toEqual(["MOVER"]);
    expect(accionesDelPlano("BEDEL", { ...fuera, conClaseEnCurso: false })).toEqual([]);
  });
});

describe("asignación desde el plano", () => {
  it("los alumnos entran hasta la capacidad inclusive", () => {
    expect(entraEnCapacidad(30, 30)).toBe(true);
    expect(entraEnCapacidad(31, 30)).toBe(false);
  });

  it("avisa asignación si la clase no tenía aula y reasignación si cambió", () => {
    expect(resolucionCorreoDeAula(null)).toBe("ASIGNADA");
    expect(resolucionCorreoDeAula("Aula 7")).toBe("REASIGNADA");
  });
});
