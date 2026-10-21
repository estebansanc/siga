import { z } from "zod";

import { turnosSchema } from "./turnos";

export const organizationNameSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre")
  .max(100, "El nombre puede tener hasta 100 caracteres");

// Todos los campos son opcionales: el PATCH manda solo lo que cambia. El producto agrega acá
// sus propias preferencias.
export const updateSettingsSchema = z.object({
  name: organizationNameSchema.optional(),
  turnos: turnosSchema.optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
