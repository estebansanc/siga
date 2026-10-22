import { z } from "zod";

import { optionalText } from "./common";

export const elementoIncidenciaSchema = z.enum(
  ["PROYECTOR", "CLIMATIZACION", "ILUMINACION", "MOBILIARIO", "CONECTIVIDAD", "OTRO"],
  "Elegí el elemento afectado",
);
export type ElementoIncidencia = z.infer<typeof elementoIncidenciaSchema>;

export const elementoIncidenciaLabels: Record<ElementoIncidencia, string> = {
  PROYECTOR: "Proyector",
  CLIMATIZACION: "Climatización",
  ILUMINACION: "Iluminación",
  MOBILIARIO: "Mobiliario",
  CONECTIVIDAD: "Conectividad",
  OTRO: "Otro",
};

export const gravedadIncidenciaSchema = z.enum(["LEVE", "IMPIDE_USO"]);
export type GravedadIncidencia = z.infer<typeof gravedadIncidenciaSchema>;

export const gravedadIncidenciaLabels: Record<GravedadIncidencia, string> = {
  LEVE: "Leve",
  IMPIDE_USO: "Impide el uso del aula",
};

export const estadoIncidenciaSchema = z.enum(["ABIERTA", "EN_CURSO", "RESUELTA"]);
export type EstadoIncidencia = z.infer<typeof estadoIncidenciaSchema>;

export const estadoIncidenciaLabels: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abierta",
  EN_CURSO: "En curso",
  RESUELTA: "Resuelta",
};

export const estadosIncidenciaPorDefecto: EstadoIncidencia[] = ["ABIERTA", "EN_CURSO"];

// Sin retroceso: cada estado avanza solo al siguiente y Resuelta es final.
const siguienteEstado: Record<EstadoIncidencia, EstadoIncidencia | null> = {
  ABIERTA: "EN_CURSO",
  EN_CURSO: "RESUELTA",
  RESUELTA: null,
};

export const siguienteEstadoIncidencia = (estado: EstadoIncidencia) => siguienteEstado[estado];

export const puedeAvanzarIncidencia = (actual: EstadoIncidencia, nuevo: EstadoIncidencia) =>
  siguienteEstado[actual] === nuevo;

export const descripcionIncidenciaMax = 500;
export const observacionesIncidenciaMax = 500;

export const fotoTiposPermitidos = ["image/jpeg", "image/png"] as const;
export const fotoMaxBytes = 5 * 1024 * 1024;
export const fotoComprimidaMaxBytes = 1024 * 1024;

export const mensajeFotoTipoInvalido = "La foto debe ser JPG o PNG";
export const mensajeFotoMuyPesada = "La foto no puede superar los 5 MB";

export const validarFotoIncidencia = (foto: { type: string; size: number }): string | null => {
  if (!(fotoTiposPermitidos as readonly string[]).includes(foto.type)) {
    return mensajeFotoTipoInvalido;
  }
  return foto.size > fotoMaxBytes ? mensajeFotoMuyPesada : null;
};

export const subirFotoIncidenciaSchema = z.object({
  contentType: z.enum(fotoTiposPermitidos, mensajeFotoTipoInvalido),
  size: z
    .number()
    .int()
    .min(1)
    .max(fotoComprimidaMaxBytes, "La foto comprimida no puede superar 1 MB"),
});
export type SubirFotoIncidencia = z.infer<typeof subirFotoIncidenciaSchema>;

export const crearIncidenciaSchema = z.object({
  aulaId: z.string().min(1, "Elegí el aula"),
  claseId: z.string().min(1).nullish(),
  elemento: elementoIncidenciaSchema,
  descripcion: z
    .string("Ingresá una descripción")
    .trim()
    .min(1, "Ingresá una descripción")
    .max(
      descripcionIncidenciaMax,
      `La descripción admite hasta ${descripcionIncidenciaMax} caracteres`,
    ),
  gravedad: gravedadIncidenciaSchema.default("LEVE"),
  fotoKey: z.string().min(1).nullish(),
});
export type CrearIncidencia = z.infer<typeof crearIncidenciaSchema>;
export type CrearIncidenciaInput = z.input<typeof crearIncidenciaSchema>;

export const cambiarEstadoIncidenciaSchema = z.object({
  estado: estadoIncidenciaSchema,
  observaciones: optionalText(observacionesIncidenciaMax),
  rehabilitarAula: z.boolean().default(false),
});
export type CambiarEstadoIncidencia = z.infer<typeof cambiarEstadoIncidenciaSchema>;
export type CambiarEstadoIncidenciaInput = z.input<typeof cambiarEstadoIncidenciaSchema>;

export const listarIncidenciasQuerySchema = z.object({
  estados: z
    .string()
    .optional()
    .transform((value) => (value ?? "").split(",").filter(Boolean))
    .pipe(z.array(estadoIncidenciaSchema)),
});
