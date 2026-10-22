import type { AvisoPrecargado } from "@repo/domain";

import { isoAInputArgentino } from "@/lib/dates";

export const estadosQueOfrecenAviso = ["CERRADA", "ABIERTA_CON_NOVEDADES"] as const;
export type EstadoConAviso = (typeof estadosQueOfrecenAviso)[number];

export const ofreceAviso = (estado: string): estado is EstadoConAviso =>
  estadosQueOfrecenAviso.some((ofrecido) => ofrecido === estado);

const tituloPorEstado: Record<EstadoConAviso, string> = {
  CERRADA: "Institución cerrada",
  ABIERTA_CON_NOVEDADES: "Institución abierta con novedades",
};

export type CambioDeEstado = {
  estado: EstadoConAviso;
  motivo: string | null;
  vigenciaHasta: string | null;
};

// El aviso que se ofrece al cerrar o abrir con novedades: urgente, para todos, con el motivo de
// cuerpo y la vigencia estimada como "hasta" (vacío si no se indicó).
export const avisoDesdeEstado = (cambio: CambioDeEstado): AvisoPrecargado => ({
  titulo: tituloPorEstado[cambio.estado],
  cuerpo: cambio.motivo ?? "",
  prioridad: "URGENTE",
  hasta: cambio.vigenciaHasta ? isoAInputArgentino(cambio.vigenciaHasta) : "",
});

export const queryDeAvisoDesdeEstado = (cambio: CambioDeEstado) => ({
  estado: cambio.estado,
  ...(cambio.motivo ? { motivo: cambio.motivo } : {}),
  ...(cambio.vigenciaHasta ? { hasta: cambio.vigenciaHasta } : {}),
});

// Lee los parámetros de `/avisos` que arma `queryDeAvisoDesdeEstado`; cualquier otra cosa no
// precarga nada.
export const avisoDesdeQuery = (params: URLSearchParams): AvisoPrecargado | null => {
  const estado = params.get("estado");
  if (!estado || !ofreceAviso(estado)) return null;
  return avisoDesdeEstado({
    estado,
    motivo: params.get("motivo"),
    vigenciaHasta: params.get("hasta"),
  });
};
