import { z } from "zod";

import { anioCarreraSchema } from "./clases";
import { idSchema, isoDate } from "./common";
import { turnoSchema } from "./enums";
import { horaSchema } from "./tiempo";

const texto = (mensaje: string, max: number) =>
  z.string().trim().min(1, mensaje).max(max, `Hasta ${max} caracteres`);

const mensajeFinPosterior = "La hora de fin debe ser posterior a la de inicio";
const mensajePeriodoInvertido = "La fecha de fin debe ser posterior a la de inicio";

export const diasSemana = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
  { valor: 7, etiqueta: "Domingo" },
] as const;

export const nombreDiaSemana = (valor: number) =>
  diasSemana.find((dia) => dia.valor === valor)?.etiqueta ?? "";

export const finPosteriorAlInicio = (inicio: string, fin: string) => fin > inicio;

const carreraBase = z.object({
  codigo: texto("Ingresá el código", 20),
  nombre: texto("Ingresá el nombre", 120),
});
export const crearCarreraSchema = carreraBase;
export const actualizarCarreraSchema = carreraBase.partial();
export type CrearCarrera = z.infer<typeof crearCarreraSchema>;
export type ActualizarCarrera = z.infer<typeof actualizarCarreraSchema>;

const materiaBase = z.object({
  carreraId: z.string().min(1, "Elegí la carrera"),
  codigo: texto("Ingresá el código", 20),
  nombre: texto("Ingresá el nombre", 120),
  anioCarrera: anioCarreraSchema,
});
export const crearMateriaSchema = materiaBase;
export const actualizarMateriaSchema = materiaBase.partial();
export type CrearMateriaInput = z.input<typeof crearMateriaSchema>;
export type CrearMateria = z.infer<typeof crearMateriaSchema>;
export type ActualizarMateria = z.infer<typeof actualizarMateriaSchema>;

const periodoBase = z.object({
  nombre: texto("Ingresá el nombre", 80),
  fechaInicio: isoDate,
  fechaFin: isoDate,
});
export const crearPeriodoSchema = periodoBase.refine(
  (periodo) => finPosteriorAlInicio(periodo.fechaInicio, periodo.fechaFin),
  { message: mensajePeriodoInvertido, path: ["fechaFin"] },
);
export const actualizarPeriodoSchema = periodoBase.partial();
export type CrearPeriodo = z.infer<typeof crearPeriodoSchema>;
export type ActualizarPeriodo = z.infer<typeof actualizarPeriodoSchema>;

const comisionBase = z.object({
  materiaId: z.string().min(1, "Elegí la materia"),
  periodoLectivoId: z.string().min(1, "Elegí el período"),
  codigo: texto("Ingresá el código", 20),
  turno: turnoSchema,
  docenteIds: z.array(idSchema).max(20, "Hasta 20 docentes").default([]),
});
export const crearComisionSchema = comisionBase;
export const actualizarComisionSchema = comisionBase.partial();
export type CrearComisionInput = z.input<typeof crearComisionSchema>;
export type CrearComision = z.infer<typeof crearComisionSchema>;
export type ActualizarComision = z.infer<typeof actualizarComisionSchema>;

const horarioBase = z.object({
  comisionId: z.string().min(1, "Elegí la comisión"),
  diaSemana: z.coerce
    .number("Elegí el día")
    .int("Elegí el día")
    .min(1, "Elegí el día")
    .max(7, "Elegí el día"),
  horaInicio: horaSchema,
  horaFin: horaSchema,
  aulaHabitualId: z
    .string()
    .transform((valor) => (valor === "" ? null : valor))
    .nullable()
    .optional(),
});
export const crearHorarioSchema = horarioBase.refine(
  (horario) => finPosteriorAlInicio(horario.horaInicio, horario.horaFin),
  { message: mensajeFinPosterior, path: ["horaFin"] },
);
export const actualizarHorarioSchema = horarioBase.omit({ comisionId: true }).partial();
export type CrearHorarioInput = z.input<typeof crearHorarioSchema>;
export type CrearHorario = z.infer<typeof crearHorarioSchema>;
export type ActualizarHorario = z.infer<typeof actualizarHorarioSchema>;

const diaNoLaborableBase = z.object({
  fecha: isoDate,
  motivo: texto("Ingresá el motivo", 120),
});
export const crearDiaNoLaborableSchema = diaNoLaborableBase;
export const actualizarDiaNoLaborableSchema = diaNoLaborableBase.partial();
export type CrearDiaNoLaborable = z.infer<typeof crearDiaNoLaborableSchema>;
export type ActualizarDiaNoLaborable = z.infer<typeof actualizarDiaNoLaborableSchema>;
