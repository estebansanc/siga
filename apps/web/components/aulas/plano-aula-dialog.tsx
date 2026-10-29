"use client";

import type { ClaseDto, PlanoAulaDto } from "@repo/api/client";
import { tipoNovedadLabels, type Perfil } from "@repo/domain";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";

import { FormDialogContent } from "@/components/form-dialog-content";

import { PlanoAcciones } from "./plano-acciones";
import { PlanoEstadoBadge } from "./plano-estado-badge";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{etiqueta}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}

const describirNovedad = (novedad: ClaseDto["novedades"][number]) => {
  const etiqueta = tipoNovedadLabels[novedad.tipo];
  return novedad.tipo === "DEMORA" && novedad.minutosDemora
    ? `${etiqueta} de ${novedad.minutosDemora} min`
    : etiqueta;
};

function ClaseEnCurso({ clase }: { clase: ClaseDto }) {
  const asistencia =
    clase.estado === "DOCENTE_PRESENTE" ? "Docente presente" : "Sin asistencia registrada";
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Clase en curso</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Dato etiqueta="Comisión" valor={clase.comision.codigo} />
        <Dato etiqueta="Materia" valor={clase.materia.nombre} />
        <Dato etiqueta="Docente" valor={clase.docentes.map((d) => d.nombre).join(", ") || "-"} />
        <Dato etiqueta="Franja" valor={`${clase.horaInicio} a ${clase.horaFin}`} />
        <Dato etiqueta="Asistencia" valor={asistencia} />
      </dl>
      <div className="flex flex-col gap-1">
        <h4 className="text-muted-foreground text-xs">Novedades activas</h4>
        {clase.novedades.length === 0 ? (
          <p className="text-sm">Sin novedades activas.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {clase.novedades.map((novedad) => (
              <li key={novedad.id}>{describirNovedad(novedad)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProximaClase({ aula }: { aula: PlanoAulaDto }) {
  const proxima = aula.proximaClase;
  return (
    <section className="flex flex-col gap-1">
      {aula.estado === "LIBRE" ? <p className="text-sm">Libre en este momento.</p> : null}
      <h3 className="text-sm font-medium">Próxima clase de hoy</h3>
      <p className="text-sm">
        {proxima
          ? `${proxima.horaInicio} a ${proxima.horaFin} · ${proxima.materia.nombre} (${proxima.comision.codigo})`
          : "No tiene más clases hoy"}
      </p>
    </section>
  );
}

export function PlanoAulaDialog({
  aula,
  perfil,
  onClose,
}: {
  aula: PlanoAulaDto;
  perfil: Perfil;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{aula.codigo}</DialogTitle>
          <DialogDescription>
            {aula.edificio}, {aula.piso} · {aula.capacidad} lugares
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <PlanoEstadoBadge estado={aula.estado} />
          </div>
          {aula.claseEnCurso ? <ClaseEnCurso clase={aula.claseEnCurso} /> : null}
          {aula.claseEnCurso ? null : <ProximaClase aula={aula} />}
          <PlanoAcciones aula={aula} perfil={perfil} />
        </div>
      </FormDialogContent>
    </Dialog>
  );
}
