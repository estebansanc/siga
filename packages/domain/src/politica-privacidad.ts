import { z } from "zod";

export const aceptarPoliticaSchema = z.object({ version: z.number().int().positive() });
export type AceptarPoliticaInput = z.infer<typeof aceptarPoliticaSchema>;

export const mensajeVersionDesactualizada =
  "Se publicó una nueva versión de la política de privacidad. Leela y aceptala para continuar.";

// La vigente es la de número más alto.
export const versionVigente = (versiones: number[]): number | null =>
  versiones.length === 0 ? null : Math.max(...versiones);

export const aceptacionPendiente = (versiones: number[], aceptadas: number[]): boolean => {
  const vigente = versionVigente(versiones);
  return vigente !== null && !aceptadas.includes(vigente);
};

export const parrafosDeLaPolitica = (texto: string): string[] =>
  texto
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);
