"use client";

import type { NovedadDto } from "@repo/api/client";
import { tipoNovedadLabels } from "@repo/domain";
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
import { ItemGroup } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { MegaphoneIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useFinalizarNovedad, useNovedades } from "@/hooks/use-novedades";
import { showRequestError } from "@/lib/form-errors";

import { EditarNovedadDialog } from "./editar-novedad-dialog";
import { HistorialNovedades } from "./historial-novedades";
import { NovedadItem } from "./novedad-item";
import { PublicarNovedadDialog } from "./publicar-novedad-dialog";

const vistas = ["activas", "historial"] as const;
type Vista = (typeof vistas)[number];
const vistaDe = (valor: unknown): Vista => vistas.find((vista) => vista === valor) ?? vistas[0];

// Novedades propias (docente) o de toda la institución (bedel, autoridad), con publicar,
// editar y finalizar en Activas (RF-05) y el Historial de solo lectura.
export function NovedadesSection({ puedePublicar }: { puedePublicar: boolean }) {
  const novedades = useNovedades();
  const finalizar = useFinalizarNovedad();
  const [vista, setVista] = useState<Vista>("activas");
  const [publicando, setPublicando] = useState(false);
  const [editando, setEditando] = useState<NovedadDto | null>(null);
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
        {puedePublicar && vista === "activas" ? (
          <CardAction>
            <Button size="sm" onClick={() => setPublicando(true)}>
              <PlusIcon />
              Publicar novedad
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs value={vista} onValueChange={(valor) => setVista(vistaDe(valor))}>
          <TabsList aria-label="Vista de novedades">
            <TabsTrigger value="activas">Activas</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="pt-2">
          {vista === "activas" ? (
            <>
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
                    <EmptyTitle>Sin novedades activas</EmptyTitle>
                    <EmptyDescription>Las novedades que publiques aparecen acá.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ItemGroup className="gap-2">
                  {novedades.data.map((novedad) => (
                    <NovedadItem
                      key={novedad.id}
                      novedad={novedad}
                      puedeGestionar={puedePublicar}
                      onEditar={() => setEditando(novedad)}
                      onFinalizar={() => setFinalizando(novedad)}
                    />
                  ))}
                </ItemGroup>
              )}
            </>
          ) : (
            <HistorialNovedades />
          )}
        </div>
      </CardContent>
      {publicando ? (
        <PublicarNovedadDialog open onOpenChange={(open) => !open && setPublicando(false)} />
      ) : null}
      {editando ? (
        <EditarNovedadDialog
          novedad={editando}
          open
          onOpenChange={(open) => !open && setEditando(null)}
        />
      ) : null}
      {finalizando ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setFinalizando(null)}
          title={`¿Finalizar la novedad ${tipoNovedadLabels[finalizando.tipo]} de ${finalizando.comision.codigo}?`}
          description="Las clases afectadas vuelven a su estado anterior y la novedad pasa al Historial."
          confirmLabel="Finalizar"
          pending={finalizar.isPending}
          onConfirm={() => void confirmarFinalizar()}
        />
      ) : null}
    </Card>
  );
}
