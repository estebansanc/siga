"use client";

import { estadoInstitucionLabels } from "@repo/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

import { useEstadoInstitucional } from "@/hooks/use-estado-institucional";
import { formatFechaHora } from "@/lib/dates";

import { EstadoInstitucionBadge } from "./estado-indicator";

export function EstadoActualCard() {
  const estado = useEstadoInstitucional();

  return (
    <Card>
      <CardHeader>
        <CardDescription>Estado actual</CardDescription>
        {estado.data ? (
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
            {estadoInstitucionLabels[estado.data.estado]}
            <EstadoInstitucionBadge estado={estado.data} />
          </CardTitle>
        ) : (
          <Skeleton className="h-8 w-48" />
        )}
      </CardHeader>
      <CardContent className="text-muted-foreground flex flex-col gap-1 text-sm">
        {estado.data ? (
          <>
            <p>
              Desde {formatFechaHora(estado.data.desde)}
              {estado.data.usuario ? ` · registrado por ${estado.data.usuario.nombre}` : null}
              {estado.data.vigenciaHasta
                ? ` · vigencia estimada hasta ${formatFechaHora(estado.data.vigenciaHasta)}`
                : null}
            </p>
            {estado.data.motivo ? <p className="text-foreground">{estado.data.motivo}</p> : null}
            <p>
              Visible para todos los perfiles en menos de 60 segundos. Con la institución cerrada
              las clases del día pasan a Suspendida.
            </p>
          </>
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
      </CardContent>
    </Card>
  );
}
