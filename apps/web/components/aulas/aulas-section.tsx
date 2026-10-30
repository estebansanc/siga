"use client";

import type { AulaGestionDto } from "@repo/api/client";
import { equipamientoLabels, type Equipamiento } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
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
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { DoorOpenIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAulas, useReactivarAula } from "@/hooks/use-aulas";
import { showRequestError } from "@/lib/form-errors";

import { AulaEstadoBadge } from "./aula-estado-badge";
import { AulaFormDialog } from "./aula-form-dialog";
import { BajaAulaDialog } from "./baja-aula-dialog";

type Accion = { tipo: "editar"; aula: AulaGestionDto } | { tipo: "baja"; aula: AulaGestionDto };

const describirEquipamiento = (aula: AulaGestionDto) =>
  aula.equipamiento.map((item) => equipamientoLabels[item as Equipamiento] ?? item).join(", ");

function AulaItem({
  aula,
  onAccion,
  onDetalle,
  onReactivar,
}: {
  aula: AulaGestionDto;
  onAccion: (accion: Accion) => void;
  onDetalle: () => void;
  onReactivar: () => void;
}) {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {aula.codigo}
          <AulaEstadoBadge aula={aula} />
        </ItemTitle>
        <ItemDescription>
          {aula.edificio}, {aula.piso} · {aula.capacidad} lugares
          {aula.equipamiento.length > 0 ? ` · ${describirEquipamiento(aula)}` : ""}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm" onClick={onDetalle}>
          Detalle
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Acciones de ${aula.codigo}`} />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {aula.activa ? (
              <>
                <DropdownMenuItem onClick={() => onAccion({ tipo: "editar", aula })}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAccion({ tipo: "baja", aula })}>
                  Dar de baja
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={onReactivar}>Reactivar</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}

// Gestión de aulas del Bedel (RF-02): listado en tiempo real por consulta periódica.
export function AulasSection({ onDetalle }: { onDetalle: (aulaId: string) => void }) {
  const [bajas, setBajas] = useState(false);
  const aulas = useAulas(bajas);
  const reactivar = useReactivarAula();
  const [accion, setAccion] = useState<Accion | null>(null);
  const cerrar = () => setAccion(null);

  const reactivarAula = async (aula: AulaGestionDto) => {
    try {
      await reactivar.mutateAsync(aula.id);
      toast.success(`${aula.codigo} reactivada`);
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aulas</CardTitle>
        <CardDescription>
          Estado y ocupación en tiempo real. Cada cambio queda en auditoría.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          variant="outline"
          value={[bajas ? "bajas" : "activas"]}
          onValueChange={(value: string[]) =>
            value.length > 0 && setBajas(value.at(-1) === "bajas")
          }
          aria-label="Aulas a mostrar"
        >
          <ToggleGroupItem value="activas">Activas</ToggleGroupItem>
          <ToggleGroupItem value="bajas">Dadas de baja</ToggleGroupItem>
        </ToggleGroup>
        {!aulas.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : aulas.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DoorOpenIcon />
              </EmptyMedia>
              <EmptyTitle>{bajas ? "Sin aulas dadas de baja" : "Sin aulas activas"}</EmptyTitle>
              <EmptyDescription>
                {bajas
                  ? "Las aulas que des de baja aparecen acá."
                  : "Las aulas que cargues aparecen acá."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {aulas.data.map((aula) => (
              <AulaItem
                key={aula.id}
                aula={aula}
                onAccion={setAccion}
                onDetalle={() => onDetalle(aula.id)}
                onReactivar={() => void reactivarAula(aula)}
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {accion?.tipo === "editar" ? <AulaFormDialog aula={accion.aula} onClose={cerrar} /> : null}
      {accion?.tipo === "baja" ? <BajaAulaDialog aula={accion.aula} onClose={cerrar} /> : null}
    </Card>
  );
}
