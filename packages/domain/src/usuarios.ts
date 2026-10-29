import { z } from "zod";

import { idSchema, optionalText } from "./common";
import { perfilSchema } from "./enums";

export const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos");

export const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresá un correo válido"));

const nombreSchema = z.string().trim().min(1, "Ingresá apellido y nombre").max(120);
const legajoSchema = optionalText(20);
const comisionIdsSchema = z.array(idSchema).max(30, "Hasta 30 comisiones");

export const crearUsuarioSchema = z.object({
  nombre: nombreSchema,
  dni: dniSchema,
  correo: correoSchema,
  legajo: legajoSchema,
  perfil: perfilSchema,
  comisionIds: comisionIdsSchema.default([]),
});
export type CrearUsuarioInput = z.input<typeof crearUsuarioSchema>;
export type CrearUsuario = z.infer<typeof crearUsuarioSchema>;

// Formulario de edición: el correo viaja pero no cambia, y un autorregistrado sin DNI puede
// seguir sin él.
export const edicionUsuarioFormSchema = crearUsuarioSchema.extend({
  correo: z.string(),
  dni: z.union([dniSchema, z.literal("")]),
});

// El correo identifica la cuenta: no se edita.
export const actualizarUsuarioSchema = z.object({
  nombre: nombreSchema.optional(),
  dni: dniSchema.optional(),
  legajo: legajoSchema,
  perfil: perfilSchema.optional(),
  comisionIds: comisionIdsSchema.optional(),
});
export type ActualizarUsuario = z.infer<typeof actualizarUsuarioSchema>;

export const usuariosQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  perfil: perfilSchema.optional(),
  bajaSolicitada: z.enum(["true"]).optional(),
});
export type UsuariosQuery = z.infer<typeof usuariosQuerySchema>;

export const estadoUsuarioSchema = z.enum(["ACTIVO", "PENDIENTE", "DESACTIVADO"]);
export type EstadoUsuario = z.infer<typeof estadoUsuarioSchema>;

export const estadoUsuarioLabels: Record<EstadoUsuario, string> = {
  ACTIVO: "Activo",
  PENDIENTE: "Pendiente de activación",
  DESACTIVADO: "Desactivado",
};

export const estadoDeUsuario = (cuenta: { activo: boolean; correoVerificado: boolean }) =>
  !cuenta.activo ? "DESACTIVADO" : cuenta.correoVerificado ? "ACTIVO" : "PENDIENTE";

export const dominioSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((valor) => valor.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Ingresá un dominio válido, como frt.utn.edu.ar"),
  );

export const dominiosPermitidosSchema = z.object({
  dominios: z
    .array(dominioSchema)
    .max(50, "Hasta 50 dominios")
    .transform((dominios) => [...new Set(dominios)]),
});
export type DominiosPermitidos = z.infer<typeof dominiosPermitidosSchema>;

export const dominioDelCorreo = (correo: string) => correo.split("@").at(-1)?.toLowerCase() ?? "";

// Sin dominios cargados vale cualquiera.
export const correoEnDominiosPermitidos = (correo: string, dominios: string[]) =>
  dominios.length === 0 || dominios.includes(dominioDelCorreo(correo));

export const mensajeDominiosRechazados = (dominios: string[]) =>
  `Solo se aceptan correos de ${dominios.join(", ")}`;

// Docente, Bedel y Autoridad solo los asigna quien administra usuarios; el autorregistro
// es Estudiante.
export const perfilDeAutorregistro = "ESTUDIANTE" as const;
