"use client";

import { tipoNovedadLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useClase } from "@/hooks/use-clases";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

import { describirAula } from "./clase-card";
import { EstadoClaseBadge } from "./estado-clase-badge";

// Detalle de una clase: docente, aula e historial de novedades del día (CUR-02, paso 3).
export function ClaseDetailDialog({
  claseId,
  onOpenChange,
}: {
  claseId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const clase = useClase(claseId);

  return (
    <Dialog open={claseId !== null} onOpenChange={onOpenChange}>
      <FormDialogContent>
        {clase.data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {clase.data.materia.nombre}
                <Badge variant="secondary">{clase.data.comision.codigo}</Badge>
              </DialogTitle>
              <DialogDescription>
                {formatFechaCorta(clase.data.fecha)} · {clase.data.horaInicio} –{" "}
                {clase.data.horaFin} · {describirAula(clase.data.aula)}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <EstadoClaseBadge clase={clase.data} />
              </dd>
              <dt className="text-muted-foreground">Docente</dt>
              <dd>
                {clase.data.docentes.length > 0
                  ? clase.data.docentes.map((docente) => docente.nombre).join(", ")
                  : "Sin docente asignado"}
              </dd>
              <dt className="text-muted-foreground">Carrera</dt>
              <dd>
                {clase.data.carrera.nombre} · {clase.data.materia.anioCarrera}.º año
              </dd>
            </dl>
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Novedades del día</h3>
              {clase.data.novedades.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin novedades.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {clase.data.novedades.map((novedad) => (
                    <li key={novedad.id} className="bg-muted/60 rounded-lg px-3 py-2 text-sm">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {tipoNovedadLabels[novedad.tipo]}
                        {novedad.minutosDemora ? ` · ${novedad.minutosDemora} min` : null}
                        {novedad.estado === "FINALIZADA" ? (
                          <Badge variant="outline">Finalizada</Badge>
                        ) : null}
                      </p>
                      {novedad.mensaje ? (
                        <p className="text-muted-foreground">“{novedad.mensaje}”</p>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {formatFechaHora(novedad.createdAt)}
                        {novedad.publicadaPorBedelia ? " · bedelía" : " · docente"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </FormDialogContent>
    </Dialog>
  );
}
