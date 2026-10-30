import { z } from "zod";

import { isoDate } from "./common";
import { origenAsignacionAulaSchema, tipoNovedadSchema } from "./enums";
import { diaSemanaDe, fechasEntre, sumarMeses } from "./tiempo";
import type { Turnos } from "./turnos";

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

const rangoYFiltros = {
  desde: fechaObligatoria("Ingresá la fecha desde"),
  hasta: fechaObligatoria("Ingresá la fecha hasta"),
  carreraId: filtroOpcional,
  materiaId: filtroOpcional,
  comisionId: filtroOpcional,
  docenteId: filtroOpcional,
  aulaId: filtroOpcional,
  pagina: z.coerce.number().int().min(1).default(1),
};

const validarRango = (
  { desde, hasta }: { desde: string; hasta: string },
  ctx: z.core.$RefinementCtx,
) => {
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
};

// RF-09 / CA-06: rango obligatorio de hasta 12 meses (los dos extremos incluidos: de
// 21/10/2025 a 21/10/2026 es válido). El Historial de Novedades solo agrega el tipo.
export const consultaNovedadesSchema = z
  .object({
    desde: rangoYFiltros.desde,
    hasta: rangoYFiltros.hasta,
    tipo: tipoNovedadSchema.optional().or(z.literal("").transform(() => undefined)),
    pagina: rangoYFiltros.pagina,
  })
  .superRefine(validarRango);
export type ConsultaNovedades = z.infer<typeof consultaNovedadesSchema>;
export type ConsultaNovedadesInput = z.input<typeof consultaNovedadesSchema>;

// RF-09 / RF-18 / EF-5: mismo rango y filtros que las novedades, sobre la asistencia docente.
export const consultaAsistenciasSchema = z.object(rangoYFiltros).superRefine(validarRango);
export type ConsultaAsistencias = z.infer<typeof consultaAsistenciasSchema>;
export type ConsultaAsistenciasInput = z.input<typeof consultaAsistenciasSchema>;

// RF-09 / CA-06 / EF-5: mismo rango y filtros; `origen` restringe solo las asignaciones.
export const consultaUsoAulasSchema = z
  .object({
    ...rangoYFiltros,
    origen: origenAsignacionAulaSchema.optional().or(z.literal("").transform(() => undefined)),
  })
  .superRefine(validarRango);
export type ConsultaUsoAulas = z.infer<typeof consultaUsoAulasSchema>;
export type ConsultaUsoAulasInput = z.input<typeof consultaUsoAulasSchema>;

// Historial de Incidencias (Resueltas): solo rango y aula; carrera, materia y docente no aplican.
export const consultaIncidenciasSchema = z
  .object({
    desde: rangoYFiltros.desde,
    hasta: rangoYFiltros.hasta,
    aulaId: filtroOpcional,
    pagina: rangoYFiltros.pagina,
  })
  .superRefine(validarRango);
export type ConsultaIncidencias = z.infer<typeof consultaIncidenciasSchema>;
export type ConsultaIncidenciasInput = z.input<typeof consultaIncidenciasSchema>;

const minutosDe = (hora: string) => {
  const [horas, minutos] = hora.split(":").map(Number) as [number, number];
  return horas * 60 + minutos;
};

export const horasDeClase = (inicio: Date, fin: Date) =>
  (fin.getTime() - inicio.getTime()) / 3_600_000;

export const horasDiariasDeTurnos = (turnos: Turnos) =>
  Object.values(turnos).reduce(
    (suma, { inicio, fin }) => suma + (minutosDe(fin) - minutosDe(inicio)) / 60,
    0,
  );

// Hay cursado de lunes a sábado; el domingo y los días no laborables no suman disponibilidad.
export const diasConDisponibilidad = (
  desde: string,
  hasta: string,
  diasNoLaborables: ReadonlySet<string>,
) =>
  fechasEntre(desde, hasta).filter(
    (fecha) => diaSemanaDe(fecha) !== 7 && !diasNoLaborables.has(fecha),
  ).length;

export const horasDisponiblesEnRango = (
  turnos: Turnos,
  desde: string,
  hasta: string,
  diasNoLaborables: ReadonlySet<string>,
) => horasDiariasDeTurnos(turnos) * diasConDisponibilidad(desde, hasta, diasNoLaborables);

export const porcentajeOcupacion = (horasOcupadas: number, horasDisponibles: number) =>
  horasDisponibles === 0 ? 0 : Math.round((horasOcupadas / horasDisponibles) * 100);

export type ConteosAsistencia = {
  clasesBase: number;
  clasesConAsistencia: number;
  clasesSinRegistro: number;
  registrosQr: number;
  registrosManuales: number;
};

export type IndicadoresAsistencia = {
  clasesBase: number;
  clasesConAsistencia: number;
  porcentajeAsistencia: number | null;
  clasesSinRegistro: number;
  registrosQr: number;
  porcentajeQr: number | null;
  registrosManuales: number;
};

const porcentaje = (parte: number, total: number) =>
  total === 0 ? null : Math.round((parte / total) * 1000) / 10;

// La base son las clases presenciales ya terminadas (una Ausente cuenta: fue avisada y no hubo
// asistencia); el QR se mide sobre el total de registros, no sobre la base.
export const calcularIndicadoresAsistencia = (
  conteos: ConteosAsistencia,
): IndicadoresAsistencia => ({
  clasesBase: conteos.clasesBase,
  clasesConAsistencia: conteos.clasesConAsistencia,
  porcentajeAsistencia: porcentaje(conteos.clasesConAsistencia, conteos.clasesBase),
  clasesSinRegistro: conteos.clasesSinRegistro,
  registrosQr: conteos.registrosQr,
  porcentajeQr: porcentaje(conteos.registrosQr, conteos.registrosQr + conteos.registrosManuales),
  registrosManuales: conteos.registrosManuales,
});
