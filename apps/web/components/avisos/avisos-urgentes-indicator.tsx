"use client";

import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { tonoClassNames } from "@/components/estado-tonos";
import { useAvisos } from "@/hooks/use-avisos";

// Los avisos urgentes vigentes van junto al indicador de estado institucional (RF-14).
export function AvisosUrgentesIndicator() {
  const avisos = useAvisos("VIGENTES");
  const urgentes = avisos.data?.filter((aviso) => aviso.prioridad === "URGENTE") ?? [];
  if (urgentes.length === 0) return null;

  const texto =
    urgentes.length === 1
      ? `Aviso urgente: ${urgentes[0].titulo}`
      : `${urgentes.length} avisos urgentes`;
  return (
    <Link
      href="/avisos"
      className="focus-visible:ring-ring pointer-coarse:min-h-11 flex min-w-0 items-center rounded-full outline-none hover:opacity-80 focus-visible:ring-2"
      aria-label={texto}
    >
      <Badge variant="outline" className={cn("max-w-48 gap-1.5 sm:max-w-80", tonoClassNames.rojo)}>
        <TriangleAlertIcon aria-hidden="true" />
        <span className="truncate">{texto}</span>
      </Badge>
    </Link>
  );
}
