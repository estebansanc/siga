"use client";

import type { IncidenciaDto } from "@repo/api/client";
import {
  elementoIncidenciaLabels,
  estadoIncidenciaLabels,
  estadoIncidenciaSchema,
  estadosIncidenciaPorDefecto,
  type EstadoIncidencia,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { useIncidencias } from "@/hooks/use-incidencias";
import { formatFechaHora } from "@/lib/dates";

import { IncidenciaEstadoBadge, IncidenciaGravedadBadge } from "./incidencia-badges";
import { IncidenciaDetalleDialog } from "./incidencia-detalle-dialog";
import { ProponerFueraDeServicioDialog } from "./proponer-fuera-de-servicio-dialog";
import { ReportarIncidenciaDialog, type AulaDeIncidencia } from "./reportar-incidencia-dialog";

export const proponeFueraDeServicio = (incidencia: IncidenciaDto) =>
  incidencia.gravedad === "IMPIDE_USO" && incidencia.aula.estado !== "FUERA_DE_SERVICIO";

export function IncidenciaItem({
  incidencia,
  onDetalle,
}: {
  incidencia: IncidenciaDto;
  onDetalle: () => void;
}) {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {incidencia.aula.codigo} · {elementoIncidenciaLabels[incidencia.elemento]}
          <IncidenciaEstadoBadge estado={incidencia.estado} />
          <IncidenciaGravedadBadge gravedad={incidencia.gravedad} />
        </ItemTitle>
        <ItemDescription>
          {formatFechaHora(incidencia.createdAt)} · {incidencia.reportadaPor.nombre}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm" onClick={onDetalle}>
          Detalle
        </Button>
      </ItemActions>
    </Item>
  );
}

type Accion =
  | { tipo: "reportar" }
  | { tipo: "detalle"; id: string }
  | { tipo: "fuera-de-servicio"; aula: AulaDeIncidencia };

// Incidencias de bedelía (RF-15): listado en tiempo real filtrable por estado.
export function IncidenciasSection() {
  const [estados, setEstados] = useState<EstadoIncidencia[]>(estadosIncidenciaPorDefecto);
  const incidencias = useIncidencias(estados);
  const [accion, setAccion] = useState<Accion | null>(null);
  const cerrar = () => setAccion(null);

  const proponer = (incidencia: IncidenciaDto) => {
    if (proponeFueraDeServicio(incidencia)) {
      setAccion({ tipo: "fuera-de-servicio", aula: incidencia.aula });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incidencias</CardTitle>
        <CardDescription>
          Problemas de infraestructura y equipamiento de las aulas, recientes primero.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setAccion({ tipo: "reportar" })}>
            <PlusIcon />
            Nueva incidencia
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          variant="outline"
          multiple
          value={estados}
          onValueChange={(value: string[]) =>
            value.length > 0 && setEstados(estadoIncidenciaSchema.array().parse(value))
          }
          aria-label="Estados a mostrar"
        >
          {estadoIncidenciaSchema.options.map((estado) => (
            <ToggleGroupItem key={estado} value={estado}>
              {estadoIncidenciaLabels[estado]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {!incidencias.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : incidencias.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Sin incidencias</EmptyTitle>
              <EmptyDescription>
                Las incidencias que se reporten con esos estados aparecen acá.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {incidencias.data.map((incidencia) => (
              <IncidenciaItem
                key={incidencia.id}
                incidencia={incidencia}
                onDetalle={() => setAccion({ tipo: "detalle", id: incidencia.id })}
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {accion?.tipo === "reportar" ? (
        <ReportarIncidenciaDialog onClose={cerrar} onReportada={proponer} />
      ) : null}
      {accion?.tipo === "detalle" ? (
        <IncidenciaDetalleDialog id={accion.id} onClose={cerrar} />
      ) : null}
      {accion?.tipo === "fuera-de-servicio" ? (
        <ProponerFueraDeServicioDialog aula={accion.aula} onClose={cerrar} />
      ) : null}
    </Card>
  );
}
