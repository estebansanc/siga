import { z } from "zod";

import { idSchema, isoDateTime } from "./common";
import { perfilSchema, type Perfil } from "./enums";

export const prioridadAvisoSchema = z.enum(["NORMAL", "URGENTE"]);
export type PrioridadAviso = z.infer<typeof prioridadAvisoSchema>;

export const prioridadAvisoLabels: Record<PrioridadAviso, string> = {
  NORMAL: "Normal",
  URGENTE: "Urgente",
};

export const vistaAvisosSchema = z.enum(["VIGENTES", "HISTORIAL", "PUBLICADOS"]);
export type VistaAvisos = z.infer<typeof vistaAvisosSchema>;

export const segmentoAvisoSchema = z.object({
  todos: z.boolean(),
  perfiles: z.array(perfilSchema),
  carreraIds: z.array(idSchema),
  anios: z.array(z.number().int().min(1).max(6)),
  comisionIds: z.array(idSchema),
});
export type SegmentoAviso = z.infer<typeof segmentoAvisoSchema>;

export const segmentoVacio: SegmentoAviso = {
  todos: false,
  perfiles: [],
  carreraIds: [],
  anios: [],
  comisionIds: [],
};

export const segmentoEstaVacio = (segmento: SegmentoAviso) =>
  !segmento.todos &&
  segmento.perfiles.length === 0 &&
  segmento.carreraIds.length === 0 &&
  segmento.anios.length === 0 &&
  segmento.comisionIds.length === 0;

export type ComisionDeDestinatario = { id: string; carreraId: string; anio: number };

// Comisiones que sigue el estudiante o dicta el docente: no hay inscripción en SiGA.
export type DestinatarioPosible = { perfil: Perfil; comisiones: ComisionDeDestinatario[] };

// Los criterios se suman: alcanza con cumplir uno (todos, su perfil, o alguna de sus comisiones
// por comisión, carrera o año).
export const avisoAlcanza = (segmento: SegmentoAviso, destinatario: DestinatarioPosible) =>
  segmento.todos ||
  segmento.perfiles.includes(destinatario.perfil) ||
  destinatario.comisiones.some(
    (comision) =>
      segmento.comisionIds.includes(comision.id) ||
      segmento.carreraIds.includes(comision.carreraId) ||
      segmento.anios.includes(comision.anio),
  );

const vigenciaDesde = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .pipe(isoDateTime.optional())
  .optional();

const vigenciaHasta = z
  .string("Indicá hasta cuándo está vigente")
  .trim()
  .min(1, "Indicá hasta cuándo está vigente")
  .pipe(isoDateTime);

export const crearAvisoSchema = z
  .object({
    titulo: z
      .string("Ingresá el título")
      .trim()
      .min(1, "Ingresá el título")
      .max(100, "El título puede tener hasta 100 caracteres"),
    cuerpo: z
      .string("Ingresá el cuerpo del aviso")
      .trim()
      .min(1, "Ingresá el cuerpo del aviso")
      .max(2000, "El cuerpo puede tener hasta 2.000 caracteres"),
    prioridad: prioridadAvisoSchema.default("NORMAL"),
    destinatarios: segmentoAvisoSchema,
    desde: vigenciaDesde,
    hasta: vigenciaHasta,
    enviarPorCorreo: z.boolean().default(false),
  })
  .superRefine((aviso, ctx) => {
    if (segmentoEstaVacio(aviso.destinatarios)) {
      ctx.addIssue({
        code: "custom",
        path: ["destinatarios"],
        message: "Elegí al menos un destinatario",
      });
    }
    const hasta = new Date(aviso.hasta).getTime();
    const desde = aviso.desde ? new Date(aviso.desde).getTime() : Date.now();
    if (hasta <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["hasta"],
        message: "La vigencia tiene que terminar en el futuro",
      });
    } else if (hasta <= desde) {
      ctx.addIssue({
        code: "custom",
        path: ["hasta"],
        message: "La vigencia tiene que terminar después de empezar",
      });
    }
  });
export type CrearAvisoInput = z.input<typeof crearAvisoSchema>;
export type CrearAviso = z.infer<typeof crearAvisoSchema>;

export const listarAvisosQuerySchema = z.object({
  vista: vistaAvisosSchema.default("VIGENTES"),
});
export type ListarAvisosQuery = z.infer<typeof listarAvisosQuerySchema>;

export type AvisoPrecargado = Pick<CrearAvisoInput, "titulo" | "cuerpo" | "prioridad"> & {
  hasta: string;
};
