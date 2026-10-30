import { estadosSolicitudAulaOrden, type EstadoSolicitudAula } from "@repo/domain";

export const estadosPorDefecto: EstadoSolicitudAula[] = ["PENDIENTE", "ASIGNADA"];

export const filtroLabels: Record<EstadoSolicitudAula, string> = {
  PENDIENTE: "Pendientes",
  ASIGNADA: "Asignación inmediata",
  APROBADA: "Aprobadas",
  RECHAZADA: "Rechazadas",
};

export const estadoSignificados: Record<EstadoSolicitudAula, { nombre: string; texto: string }> = {
  PENDIENTE: {
    nombre: "Pendiente",
    texto: "el docente pidió un aula y espera tu aprobación; el aula no está reservada.",
  },
  ASIGNADA: {
    nombre: "Asignación inmediata",
    texto:
      "la clase no tenía aula y empezaba en menos de 30 minutos, así que el sistema le dio el aula pedida sin aprobación; podés reasignarla.",
  },
  APROBADA: {
    nombre: "Aprobada",
    texto: "aprobaste la solicitud y la clase tomó el aula elegida.",
  },
  RECHAZADA: {
    nombre: "Rechazada",
    texto: "rechazaste la solicitud con un motivo; la clase conservó su aula.",
  },
};

export const ordenarEstados = (estados: string[]): EstadoSolicitudAula[] =>
  estadosSolicitudAulaOrden.filter((estado) => estados.includes(estado));
