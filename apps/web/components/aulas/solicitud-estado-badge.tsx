import { estadoSolicitudAulaLabels, type EstadoSolicitudAula } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { CheckIcon, CircleCheckIcon, ClockIcon, XIcon, type LucideIcon } from "lucide-react";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";

const presentacion: Record<EstadoSolicitudAula, { tono: Tono; icon: LucideIcon }> = {
  PENDIENTE: { tono: "amarillo", icon: ClockIcon },
  ASIGNADA: { tono: "azul", icon: CircleCheckIcon },
  APROBADA: { tono: "verde", icon: CheckIcon },
  RECHAZADA: { tono: "rojo", icon: XIcon },
};

export function SolicitudEstadoBadge({
  estado,
  etiqueta = estadoSolicitudAulaLabels[estado],
}: {
  estado: EstadoSolicitudAula;
  etiqueta?: string;
}) {
  const { tono, icon: Icon } = presentacion[estado];
  return (
    <Badge variant="outline" className={`gap-1.5 ${tonoClassNames[tono]}`} data-estado={estado}>
      <Icon aria-hidden="true" />
      {etiqueta}
    </Badge>
  );
}
