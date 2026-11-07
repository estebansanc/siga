import { z } from "zod";

import { poligonoSchema, type Poligono } from "./planos";

export const archivoPlanoTipos = ["application/pdf", "image/png", "image/jpeg"] as const;
export const archivoPlanoMaxBytes = 20 * 1024 * 1024;
export const confianzaMinimaDeAula = 0.5;
export const modelosDeteccionAulas = ["haiku", "sonnet", "opus"] as const;
export type ModeloDeteccionAulas = (typeof modelosDeteccionAulas)[number];

export const mensajeArchivoPlanoInvalido = "El plano debe ser un PDF, PNG o JPG de hasta 20 MB";

export const esArchivoPlanoValido = (archivo: { type: string; size: number }) =>
  (archivoPlanoTipos as readonly string[]).includes(archivo.type) &&
  archivo.size > 0 &&
  archivo.size <= archivoPlanoMaxBytes;

export const aulaDetectadaSchema = z.object({
  nombre: z.string().trim().max(40).nullable(),
  confianza: z.number().min(0).max(1),
  poligono: poligonoSchema,
});
export type AulaDetectada = z.infer<typeof aulaDetectadaSchema>;

export const deteccionAulasSchema = z.object({ aulas: z.array(aulaDetectadaSchema) });
export type DeteccionAulas = z.infer<typeof deteccionAulasSchema>;

export const esAulaDudosa = (aula: Pick<AulaDetectada, "nombre" | "confianza">) =>
  !aula.nombre || aula.confianza < confianzaMinimaDeAula;

export const rectanguloDeAula = (centro: { x: number; y: number }, lado = 0.1): Poligono => {
  const mitad = lado / 2;
  const x = Math.min(Math.max(centro.x - mitad, 0), 1 - lado);
  const y = Math.min(Math.max(centro.y - mitad, 0), 1 - lado);
  return [
    { x, y },
    { x: x + lado, y },
    { x: x + lado, y: y + lado },
    { x, y: y + lado },
  ];
};
