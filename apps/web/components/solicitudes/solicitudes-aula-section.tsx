"use client";

import type { ClaseDto, SolicitudAulaDto } from "@repo/api/client";
import { equipamientoLabels, type EstadoSolicitudAula, type Equipamiento } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { DoorOpenIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SolicitudEstadoBadge } from "@/components/aulas/solicitud-estado-badge";
import {
  useAprobarSolicitudAula,
  useAsignarAulaAClase,
  useClasesSinAula,
  useReasignarSolicitudAula,
  useSolicitudesAula,
} from "@/hooks/use-solicitudes-aula";
import { formatFechaCorta } from "@/lib/dates";

import { ElegirAulaDialog } from "./elegir-aula-dialog";
import { RechazarSolicitudDialog } from "./rechazar-solicitud-dialog";

type Accion =
  | { tipo: "aprobar"; solicitud: SolicitudAulaDto }
  | { tipo: "rechazar"; solicitud: SolicitudAulaDto }
  | { tipo: "reasignar"; solicitud: SolicitudAulaDto }
  | { tipo: "asignar"; clase: ClaseDto };

const tabs = [
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "ASIGNADA", label: "Asignadas" },
  { value: "APROBADA", label: "Aprobadas" },
  { value: "RECHAZADA", label: "Rechazadas" },
  { value: "SIN_AULA", label: "Clases sin aula" },
] as const;

const vacios: Record<EstadoSolicitudAula, string> = {
  PENDIENTE: "No hay solicitudes pendientes",
  ASIGNADA: "No hay asignaciones inmediatas",
  APROBADA: "Todavía no aprobaste ninguna solicitud",
  RECHAZADA: "Todavía no rechazaste ninguna solicitud",
};

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
  estado,
  onAccion,
}: {
  estado: EstadoSolicitudAula;
  onAccion: (accion: Accion) => void;
}) {
  const solicitudes = useSolicitudesAula(estado);
  if (!solicitudes.data) return <Skeleton className="h-24 w-full" />;
  if (solicitudes.data.length === 0) return <Vacio titulo={vacios[estado]} />;
  return (
    <ItemGroup className="gap-2">
      {solicitudes.data.map((solicitud) => (
        <SolicitudItem key={solicitud.id} solicitud={solicitud} onAccion={onAccion} />
      ))}
    </ItemGroup>
  );
}

function ClasesSinAulaLista({ onAccion }: { onAccion: (accion: Accion) => void }) {
  const clases = useClasesSinAula();
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
  const asignar = useAsignarAulaAClase();

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
      return (
        <ElegirAulaDialog
          claseId={accion.clase.id}
          titulo="Asignar aula"
          descripcion={`${accion.clase.materia.nombre} · ${accion.clase.comision.codigo}, ${formatFechaCorta(accion.clase.fecha)} de ${accion.clase.horaInicio} a ${accion.clase.horaFin}.`}
          confirmLabel="Asignar"
          exito="Aula asignada"
          confirmar={(aulaId) => asignar.mutateAsync({ id: accion.clase.id, aulaId })}
          onClose={onClose}
        />
      );
  }
}

// RF-16: el bedel resuelve las solicitudes de aula y asigna aula a las clases que no tienen.
export function SolicitudesAulaSection() {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [tab, setTab] = useState<string>("PENDIENTE");

  return (
    <>
      <Tabs value={tab} onValueChange={(valor) => setTab(String(valor))}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {tabs.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(({ value }) => (
          <TabsContent key={value} value={value} className="pt-4">
            {value === "SIN_AULA" ? (
              <ClasesSinAulaLista onAccion={setAccion} />
            ) : (
              <SolicitudesLista estado={value} onAccion={setAccion} />
            )}
          </TabsContent>
        ))}
      </Tabs>
      {accion ? <AccionDialog accion={accion} onClose={() => setAccion(null)} /> : null}
    </>
  );
}
