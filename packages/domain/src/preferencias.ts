import { z } from "zod";

import { anioCarreraSchema } from "./clases";
import { idSchema } from "./common";

export const actualizarPreferenciasSchema = z.object({
  comisionIds: z.array(idSchema).max(50, "Podés seguir hasta 50 comisiones").optional(),
  notificarNovedadesPorCorreo: z.boolean().optional(),
  notificarAvisosPorCorreo: z.boolean().optional(),
});
export type ActualizarPreferenciasInput = z.infer<typeof actualizarPreferenciasSchema>;

export const buscarComisionesQuerySchema = z.object({
  carreraId: z.string().optional(),
  anio: anioCarreraSchema.optional(),
  materiaId: z.string().optional(),
});
export type BuscarComisionesQuery = z.infer<typeof buscarComisionesQuerySchema>;

export const bajaCorreoSchema = z.object({ token: z.string().min(1).max(500) });
export type BajaCorreoInput = z.infer<typeof bajaCorreoSchema>;
