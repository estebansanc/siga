import { z } from "zod";

import { capacidadAulaSchema } from "./aulas";

export const planoTiposPermitidos = ["image/jpeg", "image/png"] as const;
export const planoImagenMaxBytes = 4 * 1024 * 1024;
export const poligonoMinPuntos = 3;
export const poligonoMaxPuntos = 24;

const coordenadaSchema = z.number().min(0).max(1);

export const puntoSchema = z.object({ x: coordenadaSchema, y: coordenadaSchema });
export type Punto = z.infer<typeof puntoSchema>;

export const poligonoSchema = z
  .array(puntoSchema)
  .min(poligonoMinPuntos, `El polígono necesita al menos ${poligonoMinPuntos} puntos`)
  .max(poligonoMaxPuntos, `El polígono admite hasta ${poligonoMaxPuntos} puntos`);
export type Poligono = z.infer<typeof poligonoSchema>;

// Centroide del área (fórmula del cordón); en un polígono degenerado, el promedio de los vértices.
export const centroideDePoligono = (poligono: Poligono): Punto => {
  let areaDoble = 0;
  let cx = 0;
  let cy = 0;
  poligono.forEach((a, indice) => {
    const b = poligono[(indice + 1) % poligono.length]!;
    const cruce = a.x * b.y - b.x * a.y;
    areaDoble += cruce;
    cx += (a.x + b.x) * cruce;
    cy += (a.y + b.y) * cruce;
  });
  if (Math.abs(areaDoble) < 1e-12) {
    return {
      x: poligono.reduce((suma, punto) => suma + punto.x, 0) / poligono.length,
      y: poligono.reduce((suma, punto) => suma + punto.y, 0) / poligono.length,
    };
  }
  return { x: cx / (3 * areaDoble), y: cy / (3 * areaDoble) };
};

export const codigosRepetidos = (codigos: string[]): string[] => {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const codigo of codigos) {
    if (vistos.has(codigo)) repetidos.add(codigo);
    vistos.add(codigo);
  }
  return [...repetidos];
};

export const mensajePlanoTipoInvalido = "La imagen del plano debe ser JPG o PNG";

export const subirImagenPlanoSchema = z.object({
  contentType: z.enum(planoTiposPermitidos, mensajePlanoTipoInvalido),
  size: z
    .number()
    .int()
    .min(1)
    .max(planoImagenMaxBytes, "La imagen del plano no puede superar 4 MB"),
});
export type SubirImagenPlano = z.infer<typeof subirImagenPlanoSchema>;

const textoObligatorio = (mensaje: string, max: number) =>
  z.string().trim().min(1, mensaje).max(max, `Hasta ${max} caracteres`);

export const guardarPlanoSchema = z.object({
  edificio: textoObligatorio("Ingresá el edificio", 80),
  piso: textoObligatorio("Ingresá el piso", 40),
  key: z.string().min(1, "Subí la imagen del plano"),
  ancho: z.number().int().min(1),
  alto: z.number().int().min(1),
});
export type GuardarPlano = z.infer<typeof guardarPlanoSchema>;

export const aulaDelPlanoSchema = z.object({
  codigo: textoObligatorio("Ingresá el código", 40),
  poligono: poligonoSchema,
  capacidad: capacidadAulaSchema.optional(),
});

export const importarAulasPlanoSchema = z
  .object({
    capacidadPorDefecto: capacidadAulaSchema,
    aulas: z.array(aulaDelPlanoSchema).min(1, "Informá al menos un aula"),
  })
  .superRefine((datos, contexto) => {
    const repetidos = codigosRepetidos(datos.aulas.map((aula) => aula.codigo));
    if (repetidos.length > 0) {
      contexto.addIssue({
        code: "custom",
        path: ["aulas"],
        message: `Códigos repetidos: ${repetidos.join(", ")}`,
      });
    }
  });
export type ImportarAulasPlano = z.infer<typeof importarAulasPlanoSchema>;
