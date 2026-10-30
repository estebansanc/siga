"use client";

import type { IncidenciaDto } from "@repo/api/client";
import { elementoIncidenciaLabels } from "@repo/domain";
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
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { useIncidencias } from "@/hooks/use-incidencias";
import { formatFechaHora } from "@/lib/dates";

import { HistorialIncidencias } from "./historial-incidencias";
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

const vistas = ["abiertas", "historial"] as const;
type Vista = (typeof vistas)[number];
const vistaDe = (valor: unknown): Vista => vistas.find((vista) => vista === valor) ?? vistas[0];

// Incidencias de bedelía (RF-15): Abiertas en tiempo real e Historial de las resueltas. La
// Autoridad las consulta sin modificar nada.
export function IncidenciasSection({ puedeGestionar }: { puedeGestionar: boolean }) {
  const [vista, setVista] = useState<Vista>("abiertas");
  const incidencias = useIncidencias();
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
        {puedeGestionar && vista === "abiertas" ? (
          <CardAction>
            <Button size="sm" onClick={() => setAccion({ tipo: "reportar" })}>
              <PlusIcon />
              Nueva incidencia
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs value={vista} onValueChange={(valor) => setVista(vistaDe(valor))}>
          <TabsList aria-label="Vista de incidencias">
            <TabsTrigger value="abiertas">Abiertas</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="pt-2">
          {vista === "abiertas" ? (
            <>
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
                    <EmptyTitle>Sin incidencias abiertas</EmptyTitle>
                    <EmptyDescription>
                      Las incidencias abiertas o en curso aparecen acá.
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
            </>
          ) : (
            <HistorialIncidencias />
          )}
        </div>
      </CardContent>
      {accion?.tipo === "reportar" ? (
        <ReportarIncidenciaDialog onClose={cerrar} onReportada={proponer} />
      ) : null}
      {accion?.tipo === "detalle" ? (
        <IncidenciaDetalleDialog id={accion.id} soloLectura={!puedeGestionar} onClose={cerrar} />
      ) : null}
      {accion?.tipo === "fuera-de-servicio" ? (
        <ProponerFueraDeServicioDialog aula={accion.aula} onClose={cerrar} />
      ) : null}
    </Card>
  );
}
