"use client";

import { equipamientoLabels, type Equipamiento } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { ItemGroup } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { FormDialogContent } from "@/components/form-dialog-content";
import { IncidenciaDetalleDialog } from "@/components/incidencias/incidencia-detalle-dialog";
import {
  IncidenciaItem,
  proponeFueraDeServicio,
} from "@/components/incidencias/incidencias-section";
import { ProponerFueraDeServicioDialog } from "@/components/incidencias/proponer-fuera-de-servicio-dialog";
import { ReportarIncidenciaDialog } from "@/components/incidencias/reportar-incidencia-dialog";
import { useAula } from "@/hooks/use-aulas";

import { AulaClasesList } from "./aula-clases-list";
import { AulaEstadoBadge } from "./aula-estado-badge";

type Accion =
  { tipo: "reportar" } | { tipo: "incidencia"; id: string } | { tipo: "fuera-de-servicio" };

export function AulaDetalleDialog({ aulaId, onClose }: { aulaId: string; onClose: () => void }) {
  const aula = useAula(aulaId);
  const detalle = aula.data;
  const [accion, setAccion] = useState<Accion | null>(null);
  const cerrarAccion = () => setAccion(null);

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
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Incidencias</h3>
                <Button size="sm" variant="outline" onClick={() => setAccion({ tipo: "reportar" })}>
                  <PlusIcon />
                  Reportar incidencia
                </Button>
              </div>
              {detalle.incidencias.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin incidencias reportadas.</p>
              ) : (
                <ItemGroup className="max-h-64 gap-2 overflow-y-auto">
                  {detalle.incidencias.map((incidencia) => (
                    <IncidenciaItem
                      key={incidencia.id}
                      incidencia={incidencia}
                      onDetalle={() => setAccion({ tipo: "incidencia", id: incidencia.id })}
                    />
                  ))}
                </ItemGroup>
              )}
            </section>
          </div>
        )}
      </FormDialogContent>
      {detalle && accion?.tipo === "reportar" ? (
        <ReportarIncidenciaDialog
          aula={detalle}
          onClose={cerrarAccion}
          onReportada={(incidencia) =>
            proponeFueraDeServicio(incidencia) && setAccion({ tipo: "fuera-de-servicio" })
          }
        />
      ) : null}
      {accion?.tipo === "incidencia" ? (
        <IncidenciaDetalleDialog id={accion.id} onClose={cerrarAccion} />
      ) : null}
      {detalle && accion?.tipo === "fuera-de-servicio" ? (
        <ProponerFueraDeServicioDialog aula={detalle} onClose={cerrarAccion} />
      ) : null}
    </Dialog>
  );
}
