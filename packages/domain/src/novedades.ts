import { z } from "zod";

import { idSchema, optionalText } from "./common";
import {
  estadoNovedadSchema,
  tipoNovedadLabels,
  tipoNovedadSchema,
  type TipoNovedad,
} from "./enums";

const textoOpcional = <T extends z.ZodType<string, string>>(schema: T) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(schema.optional())
    .optional();

export const minutosDemoraSchema = z.coerce
  .number("Ingresá los minutos de demora")
  .int("Ingresá minutos enteros")
  .min(1, "La demora es de al menos 1 minuto")
  .max(240, "La demora puede ser de hasta 240 minutos");

export const enlaceVirtualSchema = z.url({
  protocol: /^https?$/,
  message: "Ingresá un enlace válido, que empiece con http:// o https://",
});

// El dato obligatorio depende del tipo (novedades.md): minutos para Demora, enlace para
// Virtual, aula nueva para Cambio de aula. Ausencia y Suspensión no piden nada más.
export const publicarNovedadSchema = z
  .object({
    claseIds: z.array(idSchema).min(1, "Elegí al menos una clase"),
    tipo: tipoNovedadSchema,
    // Un campo numérico vacío llega como "" desde el formulario: cuenta como no informado.
    minutosDemora: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      minutosDemoraSchema.optional(),
    ),
    enlaceVirtual: textoOpcional(enlaceVirtualSchema),
    aulaNuevaId: textoOpcional(z.string()),
    mensaje: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.tipo === "DEMORA" && value.minutosDemora === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["minutosDemora"],
        message: "Indicá los minutos de demora",
      });
    }
    if (value.tipo === "VIRTUAL" && !value.enlaceVirtual) {
      ctx.addIssue({
        code: "custom",
        path: ["enlaceVirtual"],
        message: "Ingresá el enlace de la clase virtual",
      });
    }
    if (value.tipo === "CAMBIO_AULA" && !value.aulaNuevaId) {
      ctx.addIssue({ code: "custom", path: ["aulaNuevaId"], message: "Elegí el aula nueva" });
    }
  });
export type PublicarNovedadInput = z.input<typeof publicarNovedadSchema>;
export type PublicarNovedad = z.infer<typeof publicarNovedadSchema>;

export const listarNovedadesQuerySchema = z.object({
  estado: estadoNovedadSchema.optional(),
});
export type ListarNovedadesQuery = z.infer<typeof listarNovedadesQuerySchema>;

const camposDeEdicion = ["minutosDemora", "enlaceVirtual", "aulaNuevaId"] as const;
type CampoDeEdicion = (typeof camposDeEdicion)[number];

// Tipo y clases no se editan: de cada tipo se edita su dato propio y el mensaje, que puede
// quedar vacío (novedades.md). Ausencia y Suspensión solo editan el mensaje.
export const campoEditablePorTipo: Record<TipoNovedad, CampoDeEdicion | null> = {
  DEMORA: "minutosDemora",
  VIRTUAL: "enlaceVirtual",
  CAMBIO_AULA: "aulaNuevaId",
  AUSENCIA: null,
  SUSPENSION: null,
};

const mensajesDatoFaltante: Record<CampoDeEdicion, string> = {
  minutosDemora: "Indicá los minutos de demora",
  enlaceVirtual: "Ingresá el enlace de la clase virtual",
  aulaNuevaId: "Elegí el aula nueva",
};

const editarNovedadBaseSchema = z.object({
  minutosDemora: publicarNovedadSchema.shape.minutosDemora,
  enlaceVirtual: publicarNovedadSchema.shape.enlaceVirtual,
  aulaNuevaId: publicarNovedadSchema.shape.aulaNuevaId,
  mensaje: optionalText(500),
});

export const editarNovedadSchema = editarNovedadBaseSchema;
export type EditarNovedadInput = z.input<typeof editarNovedadSchema>;

export const editarNovedadSchemaPara = (tipo: TipoNovedad) =>
  editarNovedadBaseSchema.superRefine((value, ctx) => {
    const propio = campoEditablePorTipo[tipo];
    for (const campo of camposDeEdicion) {
      if (campo === propio) {
        if (value[campo] === undefined) {
          ctx.addIssue({ code: "custom", path: [campo], message: mensajesDatoFaltante[campo] });
        }
      } else if (value[campo] !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: `Ese dato no se edita en una novedad de ${tipoNovedadLabels[tipo]}`,
        });
      }
    }
  });
export type EditarNovedad = z.infer<ReturnType<typeof editarNovedadSchemaPara>>;
