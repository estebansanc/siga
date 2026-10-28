import { estadoPlanoLabels, type EstadoPlano } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import {
  CheckIcon,
  ClockIcon,
  UserCheckIcon,
  WrenchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";

export const planoEstadoPresentacion: Record<EstadoPlano, { tono: Tono; icon: LucideIcon }> = {
  LIBRE: { tono: "verde", icon: CheckIcon },
  PENDIENTE: { tono: "naranja", icon: ClockIcon },
  OCUPADA: { tono: "rojo", icon: UserCheckIcon },
  FUERA_DE_SERVICIO: { tono: "gris", icon: XIcon },
  EN_MANTENIMIENTO: { tono: "gris", icon: WrenchIcon },
};

// Color, icono y texto a la vez (US-8).
export function PlanoEstadoBadge({
  estado,
  className,
}: {
  estado: EstadoPlano;
  className?: string;
}) {
  const { tono, icon: Icon } = planoEstadoPresentacion[estado];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", tonoClassNames[tono], className)}
      data-estado={estado}
    >
      <Icon aria-hidden="true" />
      {estadoPlanoLabels[estado]}
    </Badge>
  );
}
