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
import { formatDesde } from "@/lib/dates";

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

function nombreAccesible(estado: EstadoInstitucionalDto, ahora: Date) {
  const { label } = estadoInstitucionPresentacion[estado.estado];
  const motivo = estado.estado === "ABIERTA" || !estado.motivo ? "" : `, ${estado.motivo}`;
  return `${label}${motivo}, desde ${formatDesde(estado.desde, ahora)}`;
}

// En todas las pantallas (RF-08): estado con color, icono y texto, desde cuándo rige, y desde
// 640 px el motivo si no está abierta; tocarlo lleva al detalle. Se actualiza solo cada 30 s.
export function EstadoIndicator() {
  const estado = useEstadoInstitucional();

  if (!estado.data) return <Skeleton className="h-6 w-36" aria-label="Estado institucional" />;

  // `dataUpdatedAt` re-renderiza en cada refresco para que "hoy" pase a "ayer" sin recargar.
  const ahora = new Date(estado.dataUpdatedAt);
  const motivo = estado.data.estado === "ABIERTA" ? null : estado.data.motivo;

  return (
    <Link
      href="/estado-institucional"
      className={cn(
        "focus-visible:ring-ring pointer-coarse:min-h-11 flex shrink-0 items-center gap-2 rounded-full outline-none hover:opacity-80 focus-visible:ring-2",
        motivo && "sm:min-w-0 sm:shrink",
      )}
      aria-label={nombreAccesible(estado.data, ahora)}
    >
      <EstadoInstitucionBadge estado={estado.data} className="shrink-0" />
      {motivo ? (
        <span className="text-muted-foreground hidden min-w-0 shrink-[999] truncate text-xs sm:inline">
          {motivo}
        </span>
      ) : null}
      <span className="text-muted-foreground hidden shrink-0 text-xs lg:inline">
        Desde {formatDesde(estado.data.desde, ahora)}
      </span>
    </Link>
  );
}
