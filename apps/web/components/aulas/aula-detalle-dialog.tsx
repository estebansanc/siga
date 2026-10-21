"use client";

import { equipamientoLabels, type Equipamiento } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAula } from "@/hooks/use-aulas";

import { AulaClasesList } from "./aula-clases-list";
import { AulaEstadoBadge } from "./aula-estado-badge";

export function AulaDetalleDialog({ aulaId, onClose }: { aulaId: string; onClose: () => void }) {
  const aula = useAula(aulaId);
  const detalle = aula.data;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{detalle ? detalle.codigo : "Aula"}</DialogTitle>
          <DialogDescription>
            {detalle ? `${detalle.edificio}, ${detalle.piso} · ${detalle.capacidad} lugares` : " "}
          </DialogDescription>
        </DialogHeader>
        {!detalle ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <AulaEstadoBadge aula={detalle} />
              {detalle.equipamiento.map((item) => (
                <Badge key={item} variant="outline">
                  {equipamientoLabels[item as Equipamiento] ?? item}
                </Badge>
              ))}
            </div>
            {detalle.observaciones ? <p className="text-sm">{detalle.observaciones}</p> : null}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Clases de hoy y los próximos 7 días</h3>
              <AulaClasesList
                clases={detalle.clases}
                vacio="Sin clases asignadas en ese período."
              />
            </section>
          </div>
        )}
      </FormDialogContent>
    </Dialog>
  );
}
