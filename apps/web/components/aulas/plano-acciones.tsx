"use client";

import type { AulaDto, ClaseDto, PlanoAulaDto } from "@repo/api/client";
import { accionesDelPlano, accionPlanoLabels, type AccionPlano, type Perfil } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Empty, EmptyHeader, EmptyTitle } from "@repo/ui/components/empty";
import { Field, FieldLabel } from "@repo/ui/components/field";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { useState } from "react";

import {
  useAulasDestino,
  useClasesAsignables,
  useMoverClase,
  useReemplazarClase,
} from "@/hooks/use-aulas";
import { useAsignarAulaAClase } from "@/hooks/use-solicitudes-aula";

import { PlanoAccionDialog } from "./plano-accion-dialog";

const describirClase = (clase: ClaseDto) =>
  `${clase.materia.nombre} · ${clase.comision.codigo}, ${clase.horaInicio} a ${clase.horaFin}`;

const agruparPorPiso = (aulas: AulaDto[]) => {
  const grupos = new Map<string, AulaDto[]>();
  for (const aula of aulas) {
    const clave = `${aula.edificio}, ${aula.piso}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), aula]);
  }
  return [...grupos];
};

function SinOpciones({ titulo }: { titulo: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>{titulo}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

function SelectorDeClase({
  id,
  etiqueta,
  clases,
  valor,
  onChange,
}: {
  id: string;
  etiqueta: string;
  clases: ClaseDto[];
  valor: string;
  onChange: (claseId: string) => void;
}) {
  if (clases.length === 0) return <SinOpciones titulo="No hay clases de hoy para asignar" />;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">Elegí una clase</NativeSelectOption>
        {clases.map((clase) => (
          <NativeSelectOption key={clase.id} value={clase.id}>
            {describirClase(clase)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

function SelectorDeAulaDestino({
  id,
  etiqueta,
  aulas,
  valor,
  onChange,
}: {
  id: string;
  etiqueta: string;
  aulas: AulaDto[];
  valor: string;
  onChange: (aulaId: string) => void;
}) {
  if (aulas.length === 0) return <SinOpciones titulo="No hay aulas libres en esa franja" />;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">Elegí un aula</NativeSelectOption>
        {agruparPorPiso(aulas).map(([piso, delPiso]) => (
          <NativeSelectOptGroup key={piso} label={piso}>
            {delPiso.map((aula) => (
              <NativeSelectOption key={aula.id} value={aula.id}>
                {aula.codigo} · {aula.capacidad} lugares
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        ))}
      </NativeSelect>
    </Field>
  );
}

type DialogoProps = { aula: PlanoAulaDto; onClose: () => void };

function AsignarClaseDialog({ aula, onClose }: DialogoProps) {
  const asignables = useClasesAsignables(aula.id);
  const asignar = useAsignarAulaAClase();
  const [claseId, setClaseId] = useState("");

  return (
    <PlanoAccionDialog
      titulo="Asignar clase"
      descripcion={`Clases de hoy sin aula que entran en ${aula.codigo} y encuentran libre su franja.`}
      confirmLabel="Asignar"
      exito="Clase asignada"
      cargando={!asignables.data}
      puedeConfirmar={claseId !== ""}
      confirmar={() => asignar.mutateAsync({ id: claseId, aulaId: aula.id })}
      onClose={onClose}
    >
      <SelectorDeClase
        id="asignar-clase"
        etiqueta="Clase"
        clases={asignables.data?.clases ?? []}
        valor={claseId}
        onChange={setClaseId}
      />
    </PlanoAccionDialog>
  );
}

function MoverClaseDialog({ aula, onClose }: DialogoProps) {
  const claseActual = aula.claseEnCurso;
  const destinos = useAulasDestino(claseActual?.id ?? "");
  const mover = useMoverClase();
  const [aulaId, setAulaId] = useState("");

  return (
    <PlanoAccionDialog
      titulo="Mover a otra aula"
      descripcion={claseActual ? describirClase(claseActual) : ""}
      confirmLabel="Mover"
      exito="Clase movida"
      cargando={!destinos.data}
      puedeConfirmar={aulaId !== "" && claseActual !== null}
      confirmar={() => mover.mutateAsync({ claseId: claseActual?.id ?? "", aulaId })}
      onClose={onClose}
    >
      <SelectorDeAulaDestino
        id="mover-aula"
        etiqueta="Aula de destino"
        aulas={destinos.data ?? []}
        valor={aulaId}
        onChange={setAulaId}
      />
    </PlanoAccionDialog>
  );
}

function ReemplazarClaseDialog({ aula, onClose }: DialogoProps) {
  const claseActual = aula.claseEnCurso;
  const asignables = useClasesAsignables(aula.id, true);
  const destinos = useAulasDestino(claseActual?.id ?? "");
  const reemplazar = useReemplazarClase(aula.id);
  const [claseId, setClaseId] = useState("");
  const [aulaDestinoId, setAulaDestinoId] = useState("");

  return (
    <PlanoAccionDialog
      titulo="Reemplazar clase"
      descripcion={`${claseActual ? describirClase(claseActual) : ""} deja ${aula.codigo}: elegí la clase que entra y el aula adonde va.`}
      confirmLabel="Reemplazar"
      exito="Clase reemplazada"
      cargando={!asignables.data || !destinos.data}
      puedeConfirmar={claseId !== "" && aulaDestinoId !== ""}
      confirmar={() => reemplazar.mutateAsync({ claseId, aulaDestinoId })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <SelectorDeClase
          id="reemplazar-clase"
          etiqueta="Clase que entra"
          clases={asignables.data?.clases ?? []}
          valor={claseId}
          onChange={setClaseId}
        />
        <SelectorDeAulaDestino
          id="reemplazar-destino"
          etiqueta="Aula para la clase actual"
          aulas={destinos.data ?? []}
          valor={aulaDestinoId}
          onChange={setAulaDestinoId}
        />
      </div>
    </PlanoAccionDialog>
  );
}

const dialogos: Record<AccionPlano, (props: DialogoProps) => React.JSX.Element> = {
  ASIGNAR: AsignarClaseDialog,
  MOVER: MoverClaseDialog,
  REEMPLAZAR: ReemplazarClaseDialog,
};

// Bedel y Autoridad actúan sobre las clases de hoy desde el panel del aula (RF-16); Docente y
// Estudiante no ven nada.
export function PlanoAcciones({ aula, perfil }: { aula: PlanoAulaDto; perfil: Perfil }) {
  const [accion, setAccion] = useState<AccionPlano | null>(null);
  const acciones = accionesDelPlano(perfil, {
    estadoAula: aula.estadoAula,
    conClaseEnCurso: aula.claseEnCurso !== null,
  });
  if (acciones.length === 0) return null;
  const Dialogo = accion ? dialogos[accion] : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {acciones.map((item) => (
          <Button key={item} variant="outline" onClick={() => setAccion(item)}>
            {accionPlanoLabels[item]}
          </Button>
        ))}
      </div>
      {Dialogo ? <Dialogo aula={aula} onClose={() => setAccion(null)} /> : null}
    </>
  );
}
