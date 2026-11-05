import { z } from "zod";

import { optionalText } from "./common";
import { equipamientoSchema, estadoAulaSchema } from "./enums";

export const capacidadAulaMin = 1;
export const capacidadAulaMax = 500;
export const observacionesAulaMax = 500;

const textoObligatorio = (mensaje: string, max: number) =>
  z.string().trim().min(1, mensaje).max(max, `Hasta ${max} caracteres`);

export const capacidadAulaSchema = z.coerce
  .number("Ingresá la capacidad")
  .int("La capacidad debe ser un número entero")
  .min(capacidadAulaMin, `La capacidad mínima es ${capacidadAulaMin}`)
  .max(capacidadAulaMax, `La capacidad máxima es ${capacidadAulaMax}`);

const aulaFields = {
  codigo: textoObligatorio("Ingresá el código", 40),
  edificio: textoObligatorio("Ingresá el edificio", 80),
  piso: textoObligatorio("Ingresá el piso", 40),
  capacidad: capacidadAulaSchema,
  equipamiento: z.array(equipamientoSchema),
  estado: estadoAulaSchema,
  observaciones: optionalText(observacionesAulaMax),
};

export const crearAulaSchema = z.object({
  ...aulaFields,
  equipamiento: aulaFields.equipamiento.default([]),
  estado: aulaFields.estado.default("DISPONIBLE"),
});
export type CrearAulaInput = z.input<typeof crearAulaSchema>;
export type CrearAula = z.infer<typeof crearAulaSchema>;

export const actualizarAulaSchema = z.object(aulaFields).partial();
export type ActualizarAula = z.infer<typeof actualizarAulaSchema>;
