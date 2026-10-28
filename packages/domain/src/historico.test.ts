import { describe, expect, it } from "vitest";

import {
  calcularIndicadoresAsistencia,
  consultaAsistenciasSchema,
  consultaNovedadesSchema,
} from "./historico";
import { sumarMeses } from "./tiempo";

const mensajes = (input: unknown) => {
  const resultado = consultaNovedadesSchema.safeParse(input);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => [issue.path.join("."), issue.message]);
};

describe("consulta histórica de novedades", () => {
  it("acepta un rango válido y filtros opcionales vacíos", () => {
    const resultado = consultaNovedadesSchema.parse({
      desde: "2026-01-01",
      hasta: "2026-01-31",
      carreraId: "",
      tipo: "",
    });
    expect(resultado).toMatchObject({ pagina: 1, carreraId: undefined, tipo: undefined });
  });

  it("pide cada fecha por separado", () => {
    expect(mensajes({ desde: "", hasta: "" })).toEqual([
      ["desde", "Ingresá la fecha desde"],
      ["hasta", "Ingresá la fecha hasta"],
    ]);
    expect(mensajes({ hasta: "2026-01-01" })).toEqual([["desde", "Ingresá la fecha desde"]]);
    expect(mensajes({ desde: "2026-01-01" })).toEqual([["hasta", "Ingresá la fecha hasta"]]);
  });

  it("rechaza un rango invertido", () => {
    expect(mensajes({ desde: "2026-02-01", hasta: "2026-01-31" })).toEqual([
      ["desde", "La fecha desde no puede ser posterior a la fecha hasta"],
    ]);
  });

  it("acepta 12 meses justos y rechaza un día más", () => {
    expect(mensajes({ desde: "2025-10-21", hasta: "2026-10-21" })).toEqual([]);
    expect(mensajes({ desde: "2025-10-21", hasta: "2026-10-22" })).toEqual([
      ["hasta", "El rango de fechas no puede superar los 12 meses"],
    ]);
  });

  it("un desde del 29 de febrero llega hasta el 28 de febrero del año siguiente", () => {
    expect(sumarMeses("2024-02-29", 12)).toBe("2025-02-28");
    expect(mensajes({ desde: "2024-02-29", hasta: "2025-02-28" })).toEqual([]);
    expect(mensajes({ desde: "2024-02-29", hasta: "2025-03-01" })).toHaveLength(1);
  });

  it("rechaza tipos desconocidos y páginas menores a 1", () => {
    expect(mensajes({ desde: "2026-01-01", hasta: "2026-01-02", tipo: "OTRO" })).toHaveLength(1);
    expect(mensajes({ desde: "2026-01-01", hasta: "2026-01-02", pagina: 0 })).toHaveLength(1);
  });
});

describe("consulta histórica de asistencia docente", () => {
  it("comparte el rango de novedades y no pide tipo", () => {
    expect(consultaAsistenciasSchema.parse({ desde: "2026-01-01", hasta: "2026-01-31" })).toEqual({
      desde: "2026-01-01",
      hasta: "2026-01-31",
      pagina: 1,
    });
    const resultado = consultaAsistenciasSchema.safeParse({
      desde: "2025-01-01",
      hasta: "2026-01-02",
    });
    expect(resultado.success ? [] : resultado.error.issues.map((issue) => issue.message)).toEqual([
      "El rango de fechas no puede superar los 12 meses",
    ]);
  });
});

describe("indicadores de asistencia docente", () => {
  it("mide la asistencia sobre la base y el QR sobre los registros", () => {
    expect(
      calcularIndicadoresAsistencia({
        clasesBase: 8,
        clasesConAsistencia: 6,
        clasesSinRegistro: 1,
        registrosQr: 3,
        registrosManuales: 1,
      }),
    ).toEqual({
      clasesBase: 8,
      clasesConAsistencia: 6,
      porcentajeAsistencia: 75,
      clasesSinRegistro: 1,
      registrosQr: 3,
      porcentajeQr: 75,
      registrosManuales: 1,
    });
  });

  it("sin base ni registros los porcentajes quedan sin dato", () => {
    const indicadores = calcularIndicadoresAsistencia({
      clasesBase: 0,
      clasesConAsistencia: 0,
      clasesSinRegistro: 0,
      registrosQr: 0,
      registrosManuales: 0,
    });
    expect(indicadores.porcentajeAsistencia).toBeNull();
    expect(indicadores.porcentajeQr).toBeNull();
  });

  it("redondea a un decimal", () => {
    expect(
      calcularIndicadoresAsistencia({
        clasesBase: 3,
        clasesConAsistencia: 1,
        clasesSinRegistro: 2,
        registrosQr: 1,
        registrosManuales: 0,
      }).porcentajeAsistencia,
    ).toBe(33.3);
  });
});
