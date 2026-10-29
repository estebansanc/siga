import { z } from "zod";

import { optionalText } from "./common";
import { dniSchema } from "./usuarios";

export const userNameSchema = z.string().trim().min(1, "Ingresá apellido y nombre").max(120);

export const updateProfileSchema = z.object({
  name: userNameSchema,
  dni: dniSchema.optional(),
  legajo: optionalText(20),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Un autorregistrado sin DNI puede seguir sin él mientras no lo cargue.
export const updateProfileFormSchema = updateProfileSchema.extend({
  dni: z.union([dniSchema, z.literal("")]),
  legajo: z.string().trim().max(20),
});
export type UpdateProfileFormInput = z.infer<typeof updateProfileFormSchema>;

export const motivoBajaMaxLength = 500;

export const solicitarBajaSchema = z.object({
  motivo: optionalText(motivoBajaMaxLength),
});
export type SolicitarBajaInput = z.infer<typeof solicitarBajaSchema>;

// La solicitud sigue pendiente hasta que desactivar la cuenta la resuelve.
export const bajaPendienteDesde = (cuenta: {
  bajaSolicitadaAt: Date | null;
  bajaResueltaAt: Date | null;
}) => (cuenta.bajaResueltaAt ? null : cuenta.bajaSolicitadaAt);
