import { z } from "zod";

import { isoDate } from "./common";

// "mias": las comisiones seguidas (estudiante) o dictadas (docente); bedel y autoridad ven
// todas en cualquier ámbito. Los filtros se combinan entre sí (CA-04).
export const ambitoClasesSchema = z.enum(["mias", "todas"]);
export type AmbitoClases = z.infer<typeof ambitoClasesSchema>;

export const anioCarreraSchema = z.coerce
  .number("Ingresá un año")
  .int("Ingresá un año")
  .min(1, "Ingresá un año entre 1 y 6")
  .max(6, "Ingresá un año entre 1 y 6");

export const listarClasesQuerySchema = z.object({
  fecha: isoDate.optional(),
  ambito: ambitoClasesSchema.default("mias"),
  carreraId: z.string().optional(),
  anio: anioCarreraSchema.optional(),
  materiaId: z.string().optional(),
  comisionId: z.string().optional(),
});
export type ListarClasesQuery = z.infer<typeof listarClasesQuerySchema>;
export type ListarClasesInput = z.input<typeof listarClasesQuerySchema>;
