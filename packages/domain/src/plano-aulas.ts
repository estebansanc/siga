import { z } from "zod";

import type { EstadoAula, EstadoClase, Perfil } from "./enums";

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

export type ConteoPiso = { libres: number; ocupadas: number; noDisponibles: number };

// Pendiente cuenta como ocupada: ambas tienen una clase en curso.
export const contarEstadosDelPiso = (estados: EstadoPlano[]): ConteoPiso => {
  const conteo: ConteoPiso = { libres: 0, ocupadas: 0, noDisponibles: 0 };
  for (const estado of estados) {
    if (estado === "LIBRE") conteo.libres += 1;
    else if (estado === "OCUPADA" || estado === "PENDIENTE") conteo.ocupadas += 1;
    else conteo.noDisponibles += 1;
  }
  return conteo;
};

const pluralizar = (cantidad: number, singular: string, plural: string) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

export const describirConteoPiso = ({ libres, ocupadas, noDisponibles }: ConteoPiso) =>
  [
    pluralizar(libres, "libre", "libres"),
    pluralizar(ocupadas, "ocupada", "ocupadas"),
    ...(noDisponibles > 0 ? [pluralizar(noDisponibles, "no disponible", "no disponibles")] : []),
  ].join(" · ");

export type AccionPlano = "ASIGNAR" | "MOVER" | "REEMPLAZAR";

export const accionPlanoLabels: Record<AccionPlano, string> = {
  ASIGNAR: "Asignar clase",
  MOVER: "Mover a otra aula",
  REEMPLAZAR: "Reemplazar clase",
};

const perfilesQueAsignanDesdeElPlano: readonly Perfil[] = ["BEDEL", "AUTORIDAD"];

export const puedeAsignarDesdeElPlano = (perfil: Perfil) =>
  perfilesQueAsignanDesdeElPlano.includes(perfil);

// Mover también vale en un aula Fuera de servicio o En mantenimiento (así se la vacía);
// Asignar y Reemplazar necesitan que el aula esté Disponible.
export const accionesDelPlano = (
  perfil: Perfil,
  aula: { estadoAula: EstadoAula; conClaseEnCurso: boolean },
): AccionPlano[] => {
  if (!puedeAsignarDesdeElPlano(perfil)) return [];
  const disponible = aula.estadoAula === "DISPONIBLE";
  if (aula.conClaseEnCurso) return disponible ? ["MOVER", "REEMPLAZAR"] : ["MOVER"];
  return disponible ? ["ASIGNAR"] : [];
};

// La clase no guarda cantidad de alumnos: se toma la de estudiantes que siguen su comisión.
export const entraEnCapacidad = (alumnos: number, capacidad: number) => alumnos <= capacidad;

export type ResolucionCorreoAula = "ASIGNADA" | "REASIGNADA";

// Una clase sin aula que recibe una se avisa como asignación; si ya tenía otra, como cambio.
export const resolucionCorreoDeAula = (aulaAnterior: string | null): ResolucionCorreoAula =>
  aulaAnterior ? "REASIGNADA" : "ASIGNADA";

export const reemplazarClaseSchema = z.object({
  claseId: z.string().min(1),
  aulaDestinoId: z.string().min(1),
});
export type ReemplazarClase = z.infer<typeof reemplazarClaseSchema>;

export const clasesAsignablesQuerySchema = z.object({
  reemplazo: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const destinosAulaQuerySchema = z.object({ claseId: z.string().min(1) });

type AulaDelPiso = { poligono: unknown; plano: unknown };

// Un piso con plano guardado dibuja las aulas ubicadas sobre la imagen; las activas sin
// polígono van aparte para que no desaparezcan. Sin plano, todas siguen en la grilla.
export const repartirAulasDelPiso = <T extends AulaDelPiso>(aulas: T[]) => {
  const plano: NonNullable<T["plano"]> | null =
    aulas.find((aula) => aula.plano !== null)?.plano ?? null;
  const ubicadas: (T & { poligono: NonNullable<T["poligono"]> })[] = [];
  const sinUbicar: T[] = [];
  for (const aula of aulas) {
    if (plano !== null && aula.poligono !== null) {
      ubicadas.push(aula as T & { poligono: NonNullable<T["poligono"]> });
    } else sinUbicar.push(aula);
  }
  return { plano, ubicadas, sinUbicar };
};

export const zoomMinimo = 1;
export const zoomMaximo = 4;
export const pasoDeZoom = 0.5;

export const acercarZoom = (zoom: number) => Math.min(zoom + pasoDeZoom, zoomMaximo);
export const alejarZoom = (zoom: number) => Math.max(zoom - pasoDeZoom, zoomMinimo);

export const describirZoom = (zoom: number) => `${Math.round(zoom * 100)} %`;
