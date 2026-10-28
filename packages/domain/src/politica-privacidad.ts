import { z } from "zod";

export const aceptarPoliticaSchema = z.object({ version: z.number().int().positive() });
export type AceptarPoliticaInput = z.infer<typeof aceptarPoliticaSchema>;

export const mensajeVersionDesactualizada =
  "Se publicó una nueva versión de la política de privacidad. Leela y aceptala para continuar.";

export const parrafosDeLaPolitica = (texto: string): string[] =>
  texto
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);
