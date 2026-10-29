"use client";

import type { AsistenciaDto, ClaseDto } from "@repo/api/client";
import { metodoAsistenciaLabels, tipoNovedadLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useClase } from "@/hooks/use-clases";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

import { describirAula } from "./clase-card";
import { EstadoClaseBadge } from "./estado-clase-badge";

const describirAsistencia = (asistencia: AsistenciaDto) =>
  `${metodoAsistenciaLabels[asistencia.metodo]} a las ${asistencia.horaLlegada}` +
  (asistencia.metodo === "MANUAL" ? ` por ${asistencia.registradaPor.nombre}` : "");

type ClaseNovedad = ClaseDto["novedades"][number];
type DatosNovedad = Pick<ClaseNovedad, "minutosDemora" | "enlaceVirtual" | "aulaNueva" | "mensaje">;

const describirDatos = (datos: DatosNovedad) =>
  [
    datos.minutosDemora ? `${datos.minutosDemora} min` : null,
    datos.enlaceVirtual,
    datos.aulaNueva ? `a ${datos.aulaNueva.codigo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

function EventoNovedad({
  titulo,
  datos,
  fecha,
  autor,
}: {
  titulo: string;
  datos: DatosNovedad;
  fecha: string;
  autor: string;
}) {
  const detalle = describirDatos(datos);
  return (
    <div>
      <p className="font-medium">
        {titulo}
        {detalle ? ` · ${detalle}` : null}
      </p>
      {datos.mensaje ? <p className="text-muted-foreground">“{datos.mensaje}”</p> : null}
      <p className="text-muted-foreground text-xs">
        {formatFechaHora(fecha)} · {autor}
      </p>
    </div>
  );
}

const autorDe = (bedelia: boolean) => (bedelia ? "bedelía" : "docente");

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
              {clase.data.asistencia ? (
                <>
                  <dt className="text-muted-foreground">Asistencia</dt>
                  <dd>
                    <p>{describirAsistencia(clase.data.asistencia)}</p>
                    {clase.data.asistencia.motivo ? (
                      <p className="text-muted-foreground">“{clase.data.asistencia.motivo}”</p>
                    ) : null}
                  </dd>
                </>
              ) : null}
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
                    <li
                      key={novedad.id}
                      className="bg-muted/60 flex flex-col gap-2 rounded-lg px-3 py-2 text-sm"
                    >
                      <EventoNovedad
                        titulo={tipoNovedadLabels[novedad.tipo]}
                        datos={novedad.publicacion ?? novedad}
                        fecha={novedad.createdAt}
                        autor={autorDe(novedad.publicadaPorBedelia)}
                      />
                      {novedad.ediciones.map((edicion) => (
                        <EventoNovedad
                          key={edicion.id}
                          titulo="Novedad editada"
                          datos={edicion}
                          fecha={edicion.createdAt}
                          autor={autorDe(edicion.editadaPorBedelia)}
                        />
                      ))}
                      {novedad.estado === "FINALIZADA" ? (
                        <Badge variant="outline" className="w-fit">
                          Finalizada
                        </Badge>
                      ) : null}
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
