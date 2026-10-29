"use client";

import type { EstadoInstitucionalDto } from "@repo/api/client";
import type { EstadoInstitucion } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, TriangleAlertIcon, XIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";
import { useEstadoInstitucional } from "@/hooks/use-estado-institucional";
import { formatHora } from "@/lib/dates";

export const estadoInstitucionPresentacion: Record<
  EstadoInstitucion,
  { label: string; tono: Tono; icon: LucideIcon }
> = {
  ABIERTA: { label: "Institución abierta", tono: "verde", icon: CheckIcon },
  ABIERTA_CON_NOVEDADES: {
    label: "Abierta con novedades",
    tono: "amarillo",
    icon: TriangleAlertIcon,
  },
  CERRADA: { label: "Institución cerrada", tono: "rojo", icon: XIcon },
};

export function EstadoInstitucionBadge({
  estado,
  className,
}: {
  estado: Pick<EstadoInstitucionalDto, "estado">;
  className?: string;
}) {
  const { label, tono, icon: Icon } = estadoInstitucionPresentacion[estado.estado];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", tonoClassNames[tono], className)}
      data-estado={estado.estado}
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

// En todas las pantallas (RF-08): estado con color, icono y texto, y la hora de la última
// actualización; tocarlo lleva al detalle. Se actualiza solo cada 30 s.
export function EstadoIndicator() {
  const estado = useEstadoInstitucional();

  if (!estado.data) return <Skeleton className="h-6 w-36" aria-label="Estado institucional" />;

  return (
    <Link
      href="/estado-institucional"
      className="focus-visible:ring-ring pointer-coarse:min-h-11 flex min-w-0 items-center gap-2 rounded-full outline-none hover:opacity-80 focus-visible:ring-2"
      aria-label={`${estadoInstitucionPresentacion[estado.data.estado].label}, actualizado ${formatHora(estado.data.desde)}`}
    >
      <EstadoInstitucionBadge estado={estado.data} />
      <span className="text-muted-foreground hidden text-xs sm:inline">
        Actualizado {formatHora(estado.data.desde)}
      </span>
    </Link>
  );
}
