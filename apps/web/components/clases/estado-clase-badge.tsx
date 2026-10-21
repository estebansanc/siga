import type { ClaseDto } from "@repo/api/client";
import { estadoClaseLabels, type EstadoClase } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import {
  BanIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleIcon,
  ClockIcon,
  VideoIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";

const presentacion: Record<EstadoClase, { tono: Tono; icon: LucideIcon }> = {
  PROGRAMADA: { tono: "gris", icon: CircleIcon },
  DEMORADA: { tono: "amarillo", icon: ClockIcon },
  DOCENTE_PRESENTE: { tono: "verde", icon: CheckIcon },
  VIRTUAL: { tono: "azul", icon: VideoIcon },
  AUSENTE: { tono: "rojo", icon: XIcon },
  SUSPENDIDA: { tono: "rojo", icon: BanIcon },
  FINALIZADA: { tono: "gris", icon: CircleCheckIcon },
};

// "Demorada 15 min" toma los minutos de la novedad activa de demora.
export const etiquetaEstadoClase = (clase: Pick<ClaseDto, "estado" | "novedades">) => {
  const demora = clase.novedades.find((novedad) => novedad.tipo === "DEMORA");
  if (clase.estado === "DEMORADA" && demora?.minutosDemora) {
    return `Demorada ${demora.minutosDemora} min`;
  }
  return estadoClaseLabels[clase.estado];
};

// Color, icono y texto a la vez (US-8).
export function EstadoClaseBadge({
  clase,
  className,
}: {
  clase: Pick<ClaseDto, "estado" | "novedades">;
  className?: string;
}) {
  const { tono, icon: Icon } = presentacion[clase.estado];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", tonoClassNames[tono], className)}
      data-estado={clase.estado}
    >
      <Icon aria-hidden="true" />
      {etiquetaEstadoClase(clase)}
    </Badge>
  );
}
