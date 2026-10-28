import { z } from "zod";

import type { EstadoAula, EstadoClase } from "./enums";

export const estadoPlanoSchema = z.enum([
  "LIBRE",
  "PENDIENTE",
  "OCUPADA",
  "FUERA_DE_SERVICIO",
  "EN_MANTENIMIENTO",
]);
export type EstadoPlano = z.infer<typeof estadoPlanoSchema>;

export const estadoPlanoLabels: Record<EstadoPlano, string> = {
  LIBRE: "Libre",
  PENDIENTE: "Pendiente",
  OCUPADA: "Ocupada",
  FUERA_DE_SERVICIO: "Fuera de servicio",
  EN_MANTENIMIENTO: "En mantenimiento",
};

// El estado del aula prevalece sobre la clase; sin asistencia (Programada o Demorada) la clase
// queda Pendiente y con "Docente presente" el aula está Ocupada, aunque tenga Demora.
export const estadoPlanoDeAula = (
  estadoAula: EstadoAula,
  claseEnCurso: EstadoClase | null,
): EstadoPlano => {
  if (estadoAula !== "DISPONIBLE") return estadoAula;
  if (claseEnCurso === null) return "LIBRE";
  return claseEnCurso === "DOCENTE_PRESENTE" ? "OCUPADA" : "PENDIENTE";
};

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export const compararCodigosAula = (a: string, b: string) => collator.compare(a, b);

const rangoPiso = (piso: string) => {
  const normalizado = piso.trim();
  if (/^pb$/i.test(normalizado)) return { grupo: 0, numero: 0 };
  const numero = /^\d+/.exec(normalizado);
  return numero ? { grupo: 1, numero: Number(numero[0]) } : { grupo: 2, numero: 0 };
};

// `piso` es texto libre: PB primero, luego por número y el resto alfabético.
export const compararPisos = (a: string, b: string) => {
  const rangoA = rangoPiso(a);
  const rangoB = rangoPiso(b);
  return rangoA.grupo - rangoB.grupo || rangoA.numero - rangoB.numero || collator.compare(a, b);
};
