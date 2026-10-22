import { z } from "zod";

import { isoDate } from "./common";
import { tipoNovedadSchema } from "./enums";
import { sumarMeses } from "./tiempo";

export const mesesMaximosHistorico = 12;
export const tamanioPaginaHistorico = 20;
export const diasRangoInicialHistorico = 30;

const fechaObligatoria = (mensaje: string) =>
  z
    .preprocess((valor) => (valor === undefined || valor === null ? "" : valor), z.string().trim())
    .pipe(z.string().min(1, mensaje))
    .pipe(isoDate);

const esFechaIso = (valor: unknown) => isoDate.safeParse(valor).success;

const filtroOpcional = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? undefined : valor))
  .optional();

// RF-09 / CA-06: rango obligatorio de hasta 12 meses (los dos extremos incluidos: de
// 21/10/2025 a 21/10/2026 es válido) y filtros opcionales combinables.
export const consultaNovedadesSchema = z
  .object({
    desde: fechaObligatoria("Ingresá la fecha desde"),
    hasta: fechaObligatoria("Ingresá la fecha hasta"),
    carreraId: filtroOpcional,
    materiaId: filtroOpcional,
    comisionId: filtroOpcional,
    docenteId: filtroOpcional,
    aulaId: filtroOpcional,
    tipo: tipoNovedadSchema.optional().or(z.literal("").transform(() => undefined)),
    pagina: z.coerce.number().int().min(1).default(1),
  })
  .superRefine(({ desde, hasta }, ctx) => {
    if (!esFechaIso(desde) || !esFechaIso(hasta)) return;
    if (desde > hasta) {
      ctx.addIssue({
        code: "custom",
        path: ["desde"],
        message: "La fecha desde no puede ser posterior a la fecha hasta",
      });
      return;
    }
    if (hasta > sumarMeses(desde, mesesMaximosHistorico)) {
      ctx.addIssue({
        code: "custom",
        path: ["hasta"],
        message: "El rango de fechas no puede superar los 12 meses",
      });
    }
  });
export type ConsultaNovedades = z.infer<typeof consultaNovedadesSchema>;
export type ConsultaNovedadesInput = z.input<typeof consultaNovedadesSchema>;
