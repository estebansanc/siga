import { z } from "zod";

import { optionalText } from "./common";
import { equipamientoLabels, equipamientoSchema, type Equipamiento } from "./enums";

export const estadoSolicitudAulaSchema = z.enum(["PENDIENTE", "ASIGNADA", "APROBADA", "RECHAZADA"]);
export type EstadoSolicitudAula = z.infer<typeof estadoSolicitudAulaSchema>;

export const estadoSolicitudAulaLabels: Record<EstadoSolicitudAula, string> = {
  PENDIENTE: "Pendiente",
  ASIGNADA: "Asignada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

export const comentarioSolicitudMax = 500;
export const maxSugerenciasAula = 5;
export const minutosAsignacionInmediata = 30;

export const mensajeAlumnosInvalidos = "Ingresá una cantidad de alumnos mayor que 0.";

export const alumnosSolicitudSchema = z.coerce
  .number(mensajeAlumnosInvalidos)
  .int(mensajeAlumnosInvalidos)
  .min(1, mensajeAlumnosInvalidos);

export const buscarAulaSolicitudSchema = z.object({
  claseId: z.string().min(1),
  alumnos: alumnosSolicitudSchema,
  recursos: z.array(equipamientoSchema).default([]),
});
export type BuscarAulaSolicitud = z.infer<typeof buscarAulaSolicitudSchema>;

export const crearSolicitudAulaSchema = buscarAulaSolicitudSchema.extend({
  aulaId: z.string().min(1),
  comentario: optionalText(comentarioSolicitudMax),
});
export type CrearSolicitudAula = z.infer<typeof crearSolicitudAulaSchema>;
export type CrearSolicitudAulaInput = z.input<typeof crearSolicitudAulaSchema>;

type AulaBuscable = { capacidad: number; equipamiento: string[] };

// Los criterios del pedido que el aula no cumple, con el texto que ve el docente.
export const criteriosQueFallan = (
  aula: AulaBuscable,
  pedido: { alumnos: number; recursos: Equipamiento[] },
): string[] => {
  const faltantes = pedido.recursos
    .filter((recurso) => !aula.equipamiento.includes(recurso))
    .map((recurso) => `Sin ${equipamientoLabels[recurso].toLowerCase()}`);
  return aula.capacidad < pedido.alumnos
    ? [`Capacidad para ${pedido.alumnos} alumnos`, ...faltantes]
    : faltantes;
};

// Una clase sin aula que empieza en menos de 30 minutos (o ya empezó) no puede esperar a bedelía.
export const esAsignacionInmediata = (inicio: Date, ahora: Date) =>
  inicio.getTime() - ahora.getTime() < minutosAsignacionInmediata * 60_000;
