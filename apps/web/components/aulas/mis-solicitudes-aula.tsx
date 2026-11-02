"use client";

import type { SolicitudAulaDto } from "@repo/api/client";
import { equipamientoLabels, type Equipamiento } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { DoorOpenIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { useMisSolicitudesAula } from "@/hooks/use-solicitudes-aula";
import { formatFechaCorta } from "@/lib/dates";

import { SolicitarAulaDialog } from "./solicitar-aula-dialog";
import { SolicitudEstadoBadge } from "./solicitud-estado-badge";

const describirRecursos = (recursos: Equipamiento[]) =>
  recursos.length === 0
    ? "Sin recursos"
    : recursos.map((recurso) => equipamientoLabels[recurso]).join(", ");

function SolicitudItem({ solicitud }: { solicitud: SolicitudAulaDto }) {
  const { clase, aula } = solicitud;
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {clase.materia} · {clase.comision}
          <SolicitudEstadoBadge estado={solicitud.estado} />
        </ItemTitle>
        <ItemDescription>
          {formatFechaCorta(clase.fecha)} · {clase.horaInicio} – {clase.horaFin} · {aula.codigo} (
          {aula.edificio}, {aula.piso})
        </ItemDescription>
        <ItemDescription>
          {solicitud.alumnos} alumnos · {describirRecursos(solicitud.recursos)}
        </ItemDescription>
        {solicitud.estado === "RECHAZADA" && solicitud.motivoRechazo ? (
          <ItemDescription>Motivo del rechazo: {solicitud.motivoRechazo}</ItemDescription>
        ) : null}
      </ItemContent>
    </Item>
  );
}

// RF-06: las solicitudes de aula propias, recientes primero.
export function MisSolicitudesAula() {
  const solicitudes = useMisSolicitudesAula();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Mis solicitudes de aula</h2>
        <Button size="sm" onClick={() => setDialogoAbierto(true)}>
          <PlusIcon />
          Nueva solicitud
        </Button>
      </div>
      {!solicitudes.data ? (
        <Skeleton className="h-24 w-full" />
      ) : solicitudes.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DoorOpenIcon />
            </EmptyMedia>
            <EmptyTitle>Todavía no pediste ningún aula</EmptyTitle>
            <EmptyDescription>
              Tus solicitudes aparecen acá con su estado y, si se rechazan, el motivo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {solicitudes.data.map((solicitud) => (
            <SolicitudItem key={solicitud.id} solicitud={solicitud} />
          ))}
        </ItemGroup>
      )}
      <SolicitarAulaDialog open={dialogoAbierto} onOpenChange={setDialogoAbierto} />
    </div>
  );
}
