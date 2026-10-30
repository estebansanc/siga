import { z } from "zod";

export const emailStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);
export type EmailStatus = z.infer<typeof emailStatusSchema>;

export const memberRoleSchema = z.enum(["owner", "member"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

// Better Auth guarda el rol como texto ("owner" o una lista separada por comas con otros
// roles); única fuente de verdad para leerlo.
export const roleOf = (role: string): MemberRole =>
  role.split(",").includes("owner") ? "owner" : "member";

// ---------- SiGA ----------

export const perfilSchema = z.enum(["ESTUDIANTE", "DOCENTE", "BEDEL", "AUTORIDAD"]);
export type Perfil = z.infer<typeof perfilSchema>;

export const perfilLabels: Record<Perfil, string> = {
  ESTUDIANTE: "Estudiante",
  DOCENTE: "Docente",
  BEDEL: "Bedel",
  AUTORIDAD: "Autoridad académica",
};

export const turnoSchema = z.enum(["MANANA", "TARDE", "NOCHE"]);
export type Turno = z.infer<typeof turnoSchema>;

export const turnoLabels: Record<Turno, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
};

export const estadoClaseSchema = z.enum([
  "PROGRAMADA",
  "DEMORADA",
  "DOCENTE_PRESENTE",
  "VIRTUAL",
  "AUSENTE",
  "SUSPENDIDA",
  "FINALIZADA",
]);
export type EstadoClase = z.infer<typeof estadoClaseSchema>;

export const estadoClaseLabels: Record<EstadoClase, string> = {
  PROGRAMADA: "Programada",
  DEMORADA: "Demorada",
  DOCENTE_PRESENTE: "Docente presente",
  VIRTUAL: "Virtual",
  AUSENTE: "Ausente",
  SUSPENDIDA: "Suspendida",
  FINALIZADA: "Finalizada",
};

// Ausente, Suspendida y Finalizada no admiten más cambios (requerimientos.md, estados).
export const estadosClaseFinales: readonly EstadoClase[] = ["AUSENTE", "SUSPENDIDA", "FINALIZADA"];
export const esEstadoClaseFinal = (estado: EstadoClase) => estadosClaseFinales.includes(estado);

export const modalidadSchema = z.enum(["PRESENCIAL", "VIRTUAL"]);
export type Modalidad = z.infer<typeof modalidadSchema>;

export const tipoNovedadSchema = z.enum([
  "AUSENCIA",
  "DEMORA",
  "VIRTUAL",
  "SUSPENSION",
  "CAMBIO_AULA",
]);
export type TipoNovedad = z.infer<typeof tipoNovedadSchema>;

export const tipoNovedadLabels: Record<TipoNovedad, string> = {
  AUSENCIA: "Ausencia",
  DEMORA: "Demora",
  VIRTUAL: "Virtual",
  SUSPENSION: "Suspensión",
  CAMBIO_AULA: "Cambio de aula",
};

// Efecto de cada tipo sobre el estado de la clase (novedades.md). Cambio de aula no lo toca.
export const estadoClasePorNovedad: Record<TipoNovedad, EstadoClase | null> = {
  AUSENCIA: "AUSENTE",
  DEMORA: "DEMORADA",
  VIRTUAL: "VIRTUAL",
  SUSPENSION: "SUSPENDIDA",
  CAMBIO_AULA: null,
};

export const estadoNovedadSchema = z.enum(["ACTIVA", "FINALIZADA"]);
export type EstadoNovedad = z.infer<typeof estadoNovedadSchema>;

export const estadoInstitucionSchema = z.enum(["ABIERTA", "CERRADA", "ABIERTA_CON_NOVEDADES"]);
export type EstadoInstitucion = z.infer<typeof estadoInstitucionSchema>;

export const estadoInstitucionLabels: Record<EstadoInstitucion, string> = {
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  ABIERTA_CON_NOVEDADES: "Abierta con novedades",
};

export const estadoAulaSchema = z.enum(["DISPONIBLE", "FUERA_DE_SERVICIO", "EN_MANTENIMIENTO"]);
export type EstadoAula = z.infer<typeof estadoAulaSchema>;

export const estadoAulaLabels: Record<EstadoAula, string> = {
  DISPONIBLE: "Disponible",
  FUERA_DE_SERVICIO: "Fuera de servicio",
  EN_MANTENIMIENTO: "En mantenimiento",
};

export const equipamientoSchema = z.enum([
  "Proyector",
  "Pantalla",
  "Computadora",
  "Climatizacion",
  "Ventilacion",
  "Pizarra",
  "Conectividad",
]);
export type Equipamiento = z.infer<typeof equipamientoSchema>;

export const equipamientoLabels: Record<Equipamiento, string> = {
  Proyector: "Proyector",
  Pantalla: "Pantalla",
  Computadora: "Computadora",
  Climatizacion: "Climatización",
  Ventilacion: "Ventilación",
  Pizarra: "Pizarra",
  Conectividad: "Conectividad",
};

export const origenAsignacionAulaSchema = z.enum([
  "GENERACION_CLASES",
  "SOLICITUD_APROBADA",
  "ASIGNACION_INMEDIATA",
  "ASIGNACION_BEDELIA",
  "CAMBIO_AULA",
]);
export type OrigenAsignacionAula = z.infer<typeof origenAsignacionAulaSchema>;

export const origenAsignacionAulaLabels: Record<OrigenAsignacionAula, string> = {
  GENERACION_CLASES: "Generación de clases",
  SOLICITUD_APROBADA: "Solicitud aprobada",
  ASIGNACION_INMEDIATA: "Asignación inmediata",
  ASIGNACION_BEDELIA: "Asignación de bedelía",
  CAMBIO_AULA: "Cambio de aula",
};
