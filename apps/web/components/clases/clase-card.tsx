"use client";

import type { ClaseDto, ClaseNovedadDto } from "@repo/api/client";
import { tipoNovedadLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@repo/ui/components/item";
import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

import { EstadoClaseBadge } from "./estado-clase-badge";

export const describirAula = (aula: ClaseDto["aula"]) =>
  aula ? `${aula.codigo}, ${aula.edificio}, ${aula.piso}` : "Sin aula asignada";

const describirNovedad = (novedad: ClaseNovedadDto) => {
  const partes = [tipoNovedadLabels[novedad.tipo]];
  if (novedad.tipo === "DEMORA" && novedad.minutosDemora)
    partes[0] += ` de ${novedad.minutosDemora} min`;
  if (novedad.tipo === "CAMBIO_AULA" && novedad.aulaNueva)
    partes[0] += ` a ${novedad.aulaNueva.codigo}`;
  if (novedad.publicadaPorBedelia) partes.push("publicada por bedelía");
  return partes.join(" · ");
};

function NovedadResumen({ novedad }: { novedad: ClaseNovedadDto }) {
  return (
    <div className="bg-muted/60 rounded-lg px-3 py-2 text-sm" data-slot="novedad">
      <p className="font-medium">{describirNovedad(novedad)}</p>
      {novedad.mensaje ? <p className="text-muted-foreground">“{novedad.mensaje}”</p> : null}
      {novedad.enlaceVirtual ? (
        <a
          className="text-primary underline underline-offset-4"
          href={novedad.enlaceVirtual}
          target="_blank"
          rel="noreferrer"
        >
          Entrar a la clase virtual
        </a>
      ) : null}
    </div>
  );
}

// Una clase: materia, comisión, horario, aula, estado y novedades activas (RF-07).
export function ClaseCard({
  clase,
  onSelect,
  actions,
  className,
}: {
  clase: ClaseDto;
  onSelect?: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  const activas = clase.novedades.filter((novedad) => novedad.estado === "ACTIVA");
  return (
    <Item
      variant="outline"
      className={cn("flex-col items-stretch gap-3", onSelect && "hover:bg-muted/50", className)}
      data-clase-id={clase.id}
      render={onSelect ? <button type="button" onClick={onSelect} /> : undefined}
    >
      <div className="flex items-start gap-3">
        <ItemContent className="min-w-0 text-left">
          <ItemTitle className="text-base">
            {clase.materia.nombre}
            <Badge variant="secondary">{clase.comision.codigo}</Badge>
          </ItemTitle>
          <ItemDescription>
            {clase.horaInicio} – {clase.horaFin} · {describirAula(clase.aula)}
          </ItemDescription>
          <EstadoClaseBadge clase={clase} className="mt-1 w-fit" />
        </ItemContent>
        {actions ? <div className="flex shrink-0 items-center">{actions}</div> : null}
      </div>
      {activas.length > 0 ? (
        <div className="flex flex-col gap-2 text-left">
          {activas.map((novedad) => (
            <NovedadResumen key={novedad.id} novedad={novedad} />
          ))}
        </div>
      ) : null}
    </Item>
  );
}
