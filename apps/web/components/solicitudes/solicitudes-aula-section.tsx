"use client";

import type { ClaseDto, SolicitudAulaDto } from "@repo/api/client";
import {
  equipamientoLabels,
  estadosSolicitudAulaOrden,
  type Equipamiento,
  type EstadoSolicitudAula,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
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
import { ChevronDownIcon, DoorOpenIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SolicitudEstadoBadge } from "@/components/aulas/solicitud-estado-badge";
import {
  useAprobarSolicitudAula,
  useClasesSinAula,
  useReasignarSolicitudAula,
  useSolicitudesAula,
} from "@/hooks/use-solicitudes-aula";
import { formatFechaCorta } from "@/lib/dates";

import { AsignarAulaDialog } from "./asignar-aula-dialog";
import { ElegirAulaDialog } from "./elegir-aula-dialog";
import {
  estadoSignificados,
  estadosPorDefecto,
  filtroLabels,
  ordenarEstados,
} from "./estados-solicitud";
import { RechazarSolicitudDialog } from "./rechazar-solicitud-dialog";

type Accion =
  | { tipo: "aprobar"; solicitud: SolicitudAulaDto }
  | { tipo: "rechazar"; solicitud: SolicitudAulaDto }
  | { tipo: "reasignar"; solicitud: SolicitudAulaDto }
  | { tipo: "asignar"; clase: ClaseDto };

const describirRecursos = (recursos: Equipamiento[]) =>
  recursos.length === 0
    ? "Sin recursos"
    : recursos.map((recurso) => equipamientoLabels[recurso]).join(", ");

const describirAula = (aula: { codigo: string; edificio: string; piso: string }) =>
  `${aula.codigo} (${aula.edificio}, ${aula.piso})`;

function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DoorOpenIcon />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        {children ? <EmptyDescription>{children}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  );
}

function SolicitudItem({
  solicitud,
  onAccion,
}: {
  solicitud: SolicitudAulaDto;
  onAccion: (accion: Accion) => void;
}) {
  const { clase } = solicitud;
  const etiquetaAula = solicitud.estado === "PENDIENTE" ? "Aula pedida" : "Aula";
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {clase.materia} · {clase.comision}
          <SolicitudEstadoBadge
            estado={solicitud.estado}
            etiqueta={solicitud.estado === "ASIGNADA" ? "Asignada (inmediata)" : undefined}
          />
        </ItemTitle>
        <ItemDescription>
          {solicitud.solicitante.nombre} · {formatFechaCorta(clase.fecha)} · {clase.horaInicio} –{" "}
          {clase.horaFin}
        </ItemDescription>
        <ItemDescription>
          {etiquetaAula}: {describirAula(solicitud.aula)}
          {solicitud.estado === "PENDIENTE" && clase.aula
            ? ` · Aula actual de la clase: ${clase.aula.codigo}`
            : ""}
        </ItemDescription>
        <ItemDescription>
          {solicitud.alumnos} alumnos · {describirRecursos(solicitud.recursos)}
        </ItemDescription>
        {solicitud.comentario ? (
          <ItemDescription>Comentario: {solicitud.comentario}</ItemDescription>
        ) : null}
        {solicitud.estado === "RECHAZADA" && solicitud.motivoRechazo ? (
          <ItemDescription>Motivo del rechazo: {solicitud.motivoRechazo}</ItemDescription>
        ) : null}
      </ItemContent>
      {solicitud.estado === "PENDIENTE" || solicitud.estado === "ASIGNADA" ? (
        <ItemActions>
          {solicitud.estado === "PENDIENTE" ? (
            <>
              <Button size="sm" onClick={() => onAccion({ tipo: "aprobar", solicitud })}>
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAccion({ tipo: "rechazar", solicitud })}
              >
                Rechazar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAccion({ tipo: "reasignar", solicitud })}
            >
              Reasignar
            </Button>
          )}
        </ItemActions>
      ) : null}
    </Item>
  );
}

function SolicitudesLista({
  estados,
  onAccion,
}: {
  estados: EstadoSolicitudAula[];
  onAccion: (accion: Accion) => void;
}) {
  const solicitudes = useSolicitudesAula(estados);
  if (estados.length === 0) return <Vacio titulo="Elegí al menos un estado para ver solicitudes" />;
  if (!solicitudes.data) return <Skeleton className="h-24 w-full" />;
  if (solicitudes.data.length === 0) {
    return <Vacio titulo="No hay solicitudes en los estados elegidos" />;
  }
  return (
    <ItemGroup className="gap-2">
      {solicitudes.data.map((solicitud) => (
        <SolicitudItem key={solicitud.id} solicitud={solicitud} onAccion={onAccion} />
      ))}
    </ItemGroup>
  );
}

function SignificadoDeEstados() {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="pointer-coarse:min-h-11 group -ml-2 justify-start"
          />
        }
      >
        Qué significa cada estado
        <ChevronDownIcon className="group-data-panel-open:rotate-180 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="text-muted-foreground flex flex-col gap-2 pt-2 text-sm">
          {estadosSolicitudAulaOrden.map((estado) => (
            <li key={estado}>
              <strong className="text-foreground">{estadoSignificados[estado].nombre}</strong>:{" "}
              {estadoSignificados[estado].texto}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ClasesSinAulaLista({
  clases,
  onAccion,
}: {
  clases: ReturnType<typeof useClasesSinAula>;
  onAccion: (accion: Accion) => void;
}) {
  if (!clases.data) return <Skeleton className="h-24 w-full" />;
  if (clases.data.clases.length === 0) {
    return (
      <Vacio titulo="No hay clases sin aula">
        Las clases presenciales de hoy y los próximos 7 días tienen aula asignada.
      </Vacio>
    );
  }
  return (
    <ItemGroup className="gap-2">
      {clases.data.clases.map((clase) => (
        <Item key={clase.id} variant="outline">
          <ItemContent>
            <ItemTitle>
              {clase.materia.nombre} · {clase.comision.codigo}
            </ItemTitle>
            <ItemDescription>
              {formatFechaCorta(clase.fecha)} · {clase.horaInicio} – {clase.horaFin} · Sin aula
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button size="sm" onClick={() => onAccion({ tipo: "asignar", clase })}>
              Asignar aula
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}

function AccionDialog({ accion, onClose }: { accion: Accion; onClose: () => void }) {
  const aprobar = useAprobarSolicitudAula();
  const reasignar = useReasignarSolicitudAula();

  switch (accion.tipo) {
    case "rechazar":
      return <RechazarSolicitudDialog solicitud={accion.solicitud} onClose={onClose} />;
    case "aprobar":
      return (
        <ElegirAulaDialog
          claseId={accion.solicitud.clase.id}
          titulo="Aprobar solicitud"
          descripcion={`${accion.solicitud.clase.materia} · ${accion.solicitud.clase.comision}. Podés cambiar el aula pedida; la clase toma la que elijas.`}
          confirmLabel="Aprobar"
          exito="Solicitud aprobada"
          aulaPreelegidaId={accion.solicitud.aula.id}
          aulaActualId={accion.solicitud.clase.aula?.id}
          confirmar={(aulaId) => aprobar.mutateAsync({ id: accion.solicitud.id, aulaId })}
          onClose={onClose}
        />
      );
    case "reasignar":
      return (
        <ElegirAulaDialog
          claseId={accion.solicitud.clase.id}
          titulo="Reasignar aula"
          descripcion={`${accion.solicitud.clase.materia} · ${accion.solicitud.clase.comision}. Aula actual: ${accion.solicitud.clase.aula?.codigo ?? "ninguna"}.`}
          confirmLabel="Reasignar"
          exito="Aula reasignada"
          aulaActualId={accion.solicitud.clase.aula?.id}
          confirmar={(aulaId) => reasignar.mutateAsync({ id: accion.solicitud.id, aulaId })}
          onClose={onClose}
        />
      );
    case "asignar":
      return <AsignarAulaDialog clase={accion.clase} onClose={onClose} />;
  }
}

// RF-16: el bedel asigna aula a las clases que no tienen y resuelve las solicitudes de aula.
export function SolicitudesAulaSection() {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [estados, setEstados] = useState<EstadoSolicitudAula[]>(estadosPorDefecto);
  const clasesSinAula = useClasesSinAula();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Clases sin aula{clasesSinAula.data ? ` (${clasesSinAula.data.clases.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClasesSinAulaLista clases={clasesSinAula} onAccion={setAccion} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleGroup
            multiple
            variant="outline"
            className="flex-wrap"
            value={estados}
            onValueChange={(value: string[]) => setEstados(ordenarEstados(value))}
            aria-label="Estados a mostrar"
          >
            {estadosSolicitudAulaOrden.map((estado) => (
              <ToggleGroupItem key={estado} value={estado}>
                {filtroLabels[estado]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <SignificadoDeEstados />
          <SolicitudesLista estados={estados} onAccion={setAccion} />
        </CardContent>
      </Card>
      {accion ? <AccionDialog accion={accion} onClose={() => setAccion(null)} /> : null}
    </>
  );
}
