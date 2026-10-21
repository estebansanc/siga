import { z } from "zod";

import { isoDateTime, optionalText } from "./common";
import { estadoInstitucionSchema } from "./enums";

// El motivo es obligatorio salvo para "Abierta" (RF-01).
export const cambiarEstadoInstitucionalSchema = z
  .object({
    estado: estadoInstitucionSchema,
    motivo: optionalText(280),
    vigenciaHasta: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(isoDateTime.nullable())
      .nullable()
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.estado !== "ABIERTA" && !value.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Indicá el motivo" });
    }
  });
export type CambiarEstadoInstitucionalInput = z.input<typeof cambiarEstadoInstitucionalSchema>;
export type CambiarEstadoInstitucional = z.infer<typeof cambiarEstadoInstitucionalSchema>;
