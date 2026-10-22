import {
  estadoIncidenciaLabels,
  gravedadIncidenciaLabels,
  type EstadoIncidencia,
  type GravedadIncidencia,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { CircleAlertIcon, CircleCheckIcon, WrenchIcon, type LucideIcon } from "lucide-react";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";

const presentacion: Record<EstadoIncidencia, { tono: Tono; icon: LucideIcon }> = {
  ABIERTA: { tono: "rojo", icon: CircleAlertIcon },
  EN_CURSO: { tono: "amarillo", icon: WrenchIcon },
  RESUELTA: { tono: "verde", icon: CircleCheckIcon },
};

export function IncidenciaEstadoBadge({ estado }: { estado: EstadoIncidencia }) {
  const { tono, icon: Icon } = presentacion[estado];
  return (
    <Badge variant="outline" className={`gap-1.5 ${tonoClassNames[tono]}`} data-estado={estado}>
      <Icon aria-hidden="true" />
      {estadoIncidenciaLabels[estado]}
    </Badge>
  );
}

export function IncidenciaGravedadBadge({ gravedad }: { gravedad: GravedadIncidencia }) {
  return (
    <Badge variant={gravedad === "IMPIDE_USO" ? "destructive" : "secondary"}>
      {gravedadIncidenciaLabels[gravedad]}
    </Badge>
  );
}
