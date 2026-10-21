"use client";

import type { NovedadDto } from "@repo/api/client";
import { tipoNovedadLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
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
import { MegaphoneIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useFinalizarNovedad, useNovedades } from "@/hooks/use-novedades";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

import { PublicarNovedadDialog } from "./publicar-novedad-dialog";

const finalizable = (novedad: NovedadDto) =>
  novedad.estado === "ACTIVA" && novedad.tipo !== "AUSENCIA" && novedad.tipo !== "SUSPENSION";

const describirDetalle = (novedad: NovedadDto) => {
  if (novedad.tipo === "DEMORA" && novedad.minutosDemora) return `${novedad.minutosDemora} min`;
  if (novedad.tipo === "CAMBIO_AULA" && novedad.aulaNueva) return `a ${novedad.aulaNueva.codigo}`;
  if (novedad.tipo === "VIRTUAL" && novedad.enlaceVirtual) return novedad.enlaceVirtual;
  return null;
};

function NovedadItem({ novedad, onFinalizar }: { novedad: NovedadDto; onFinalizar: () => void }) {
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
          <Badge variant={novedad.estado === "ACTIVA" ? "default" : "outline"}>
            {novedad.estado === "ACTIVA" ? "Activa" : "Finalizada"}
          </Badge>
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
      {finalizable(novedad) ? (
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
              <DropdownMenuItem onClick={onFinalizar}>Finalizar novedad</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      ) : null}
    </Item>
  );
}

// Novedades propias (docente) o de toda la institución (bedel, autoridad), con publicar y
// finalizar (RF-05).
export function NovedadesSection({ puedePublicar }: { puedePublicar: boolean }) {
  const novedades = useNovedades();
  const finalizar = useFinalizarNovedad();
  const [publicando, setPublicando] = useState(false);
  const [finalizando, setFinalizando] = useState<NovedadDto | null>(null);

  const confirmarFinalizar = async () => {
    if (!finalizando) return;
    try {
      await finalizar.mutateAsync(finalizando.id);
      toast.success("Novedad finalizada");
      setFinalizando(null);
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novedades</CardTitle>
        <CardDescription>
          Ausencias, demoras, clases virtuales, suspensiones y cambios de aula. Cada cambio queda en
          el historial.
        </CardDescription>
        {puedePublicar ? (
          <CardAction>
            <Button size="sm" onClick={() => setPublicando(true)}>
              <PlusIcon />
              Publicar novedad
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {!novedades.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : novedades.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MegaphoneIcon />
              </EmptyMedia>
              <EmptyTitle>Sin novedades publicadas</EmptyTitle>
              <EmptyDescription>Las novedades que publiques aparecen acá.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {novedades.data.map((novedad) => (
              <NovedadItem
                key={novedad.id}
                novedad={novedad}
                onFinalizar={() => setFinalizando(novedad)}
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {publicando ? (
        <PublicarNovedadDialog open onOpenChange={(open) => !open && setPublicando(false)} />
      ) : null}
      {finalizando ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setFinalizando(null)}
          title={`¿Finalizar la novedad ${tipoNovedadLabels[finalizando.tipo]} de ${finalizando.comision.codigo}?`}
          description="Las clases afectadas vuelven a su estado anterior y la novedad queda en el historial."
          confirmLabel="Finalizar"
          pending={finalizar.isPending}
          onConfirm={() => void confirmarFinalizar()}
        />
      ) : null}
    </Card>
  );
}
