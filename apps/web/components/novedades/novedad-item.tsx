"use client";

import type { NovedadDto } from "@repo/api/client";
import { tipoNovedadLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import { MoreHorizontalIcon } from "lucide-react";

import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

// Una novedad sin finalizar cuyas clases ya pasaron (Ausencia, Suspensión) está en el Historial.
function EstadoBadge({ novedad }: { novedad: NovedadDto }) {
  if (novedad.editable) return <Badge>Activa</Badge>;
  return (
    <Badge variant="outline">
      {novedad.estado === "FINALIZADA" ? "Finalizada" : "Sin clases pendientes"}
    </Badge>
  );
}

const finalizable = (novedad: NovedadDto) =>
  novedad.estado === "ACTIVA" && novedad.tipo !== "AUSENCIA" && novedad.tipo !== "SUSPENSION";

const describirDetalle = (novedad: NovedadDto) => {
  if (novedad.tipo === "DEMORA" && novedad.minutosDemora) return `${novedad.minutosDemora} min`;
  if (novedad.tipo === "CAMBIO_AULA" && novedad.aulaNueva) return `a ${novedad.aulaNueva.codigo}`;
  if (novedad.tipo === "VIRTUAL" && novedad.enlaceVirtual) return novedad.enlaceVirtual;
  return null;
};

export function NovedadItem({
  novedad,
  puedeGestionar,
  onEditar,
  onFinalizar,
}: {
  novedad: NovedadDto;
  puedeGestionar: boolean;
  onEditar?: () => void;
  onFinalizar?: () => void;
}) {
  const detalle = describirDetalle(novedad);
  const clases = novedad.clases
    .map((clase) => `${formatFechaCorta(clase.fecha)} ${clase.horaInicio}`)
    .join(", ");
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {tipoNovedadLabels[novedad.tipo]}
          {detalle ? <span className="text-muted-foreground font-normal">{detalle}</span> : null}
          <EstadoBadge novedad={novedad} />
        </ItemTitle>
        <ItemDescription>
          {novedad.comision.materia} · {novedad.comision.codigo} · {clases}
        </ItemDescription>
        {novedad.mensaje ? <ItemDescription>“{novedad.mensaje}”</ItemDescription> : null}
        <ItemDescription className="text-xs">
          {formatFechaHora(novedad.createdAt)} · {novedad.publicadaPor.nombre}
          {novedad.publicadaPorBedelia ? " (bedelía)" : null}
        </ItemDescription>
      </ItemContent>
      {puedeGestionar && (novedad.editable || finalizable(novedad)) ? (
        <ItemActions>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Acciones de la novedad ${tipoNovedadLabels[novedad.tipo]} de ${novedad.comision.codigo}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {novedad.editable ? (
                <DropdownMenuItem onClick={onEditar}>Editar novedad</DropdownMenuItem>
              ) : null}
              {finalizable(novedad) ? (
                <DropdownMenuItem onClick={onFinalizar}>Finalizar novedad</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      ) : null}
    </Item>
  );
}
