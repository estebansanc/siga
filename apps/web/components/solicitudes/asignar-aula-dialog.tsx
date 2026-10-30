"use client";

import type { ClaseDto } from "@repo/api/client";
import {
  alumnosSolicitudSchema,
  equipamientoLabels,
  equipamientoSchema,
  type BusquedaAulaPedido,
  type Equipamiento,
} from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useState } from "react";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAsignarAulaAClase, useBuscarAulas } from "@/hooks/use-solicitudes-aula";
import { formatFechaCorta } from "@/lib/dates";

import { describirAula, useConfirmarAula } from "./elegir-aula-dialog";

const validarAlumnos = (texto: string) => {
  if (texto.trim() === "") return { alumnos: undefined, error: null };
  const resultado = alumnosSolicitudSchema.safeParse(texto);
  return resultado.success
    ? { alumnos: resultado.data, error: null }
    : { alumnos: undefined, error: resultado.error.issues[0]?.message ?? null };
};

// El Bedel asigna aula a una clase sin aula: sin filtros ve todas las libres; con cantidad de
// alumnos y recursos, solo las que cumplen o, si ninguna, hasta 5 con lo que les falta.
export function AsignarAulaDialog({ clase, onClose }: { clase: ClaseDto; onClose: () => void }) {
  const asignar = useAsignarAulaAClase();
  const [alumnosTexto, setAlumnosTexto] = useState("");
  const [recursos, setRecursos] = useState<Equipamiento[]>([]);
  const [elegidaId, setElegidaId] = useState("");
  const { pending, error, enviar } = useConfirmarAula(
    (aulaId) => asignar.mutateAsync({ id: clase.id, aulaId }),
    "Aula asignada",
    onClose,
  );

  const { alumnos, error: errorAlumnos } = validarAlumnos(alumnosTexto);
  const pedido: BusquedaAulaPedido | null = errorAlumnos
    ? null
    : { claseId: clase.id, alumnos, recursos };
  const busqueda = useBuscarAulas(pedido);
  const resultado = errorAlumnos ? undefined : busqueda.data;
  const opciones = [
    ...(resultado?.aulas ?? []).map((aula) => ({ aula, faltantes: [] as string[] })),
    ...(resultado?.sugerencias ?? []).map((aula) => ({ aula, faltantes: aula.faltantes })),
  ];
  const aulaId = opciones.some(({ aula }) => aula.id === elegidaId) ? elegidaId : "";
  const sinCoincidencias = resultado !== undefined && resultado.aulas.length === 0;

  const cambiarRecurso = (recurso: Equipamiento, marcado: boolean) =>
    setRecursos(marcado ? [...recursos, recurso] : recursos.filter((actual) => actual !== recurso));

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Asignar aula</DialogTitle>
          <DialogDescription>
            {`${clase.materia.nombre} · ${clase.comision.codigo}, ${formatFechaCorta(clase.fecha)} de ${clase.horaInicio} a ${clase.horaFin}.`}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={Boolean(errorAlumnos)}>
            <FieldLabel htmlFor="asignar-alumnos">Cantidad de alumnos</FieldLabel>
            <Input
              id="asignar-alumnos"
              type="number"
              inputMode="numeric"
              value={alumnosTexto}
              aria-invalid={Boolean(errorAlumnos)}
              onChange={(event) => setAlumnosTexto(event.target.value)}
            />
            <FieldError>{errorAlumnos}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Recursos</FieldLabel>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Recursos">
              {equipamientoSchema.options.map((recurso) => (
                <Label key={recurso} className="font-normal">
                  <Checkbox
                    checked={recursos.includes(recurso)}
                    onCheckedChange={(valor) => cambiarRecurso(recurso, valor === true)}
                  />
                  {equipamientoLabels[recurso]}
                </Label>
              ))}
            </div>
          </Field>
        </FieldGroup>
        {sinCoincidencias ? (
          <Alert>
            <AlertTitle>Ninguna aula cumple todos los criterios.</AlertTitle>
            <AlertDescription>
              {resultado.hayAulasLibres
                ? "Estas aulas libres cumplen en parte:"
                : "No hay aulas libres en esa franja."}
            </AlertDescription>
          </Alert>
        ) : null}
        {pedido && !resultado ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Field>
            <FieldLabel htmlFor="elegir-aula">Aula</FieldLabel>
            <NativeSelect
              id="elegir-aula"
              className="w-full"
              value={aulaId}
              disabled={opciones.length === 0}
              onChange={(event) => setElegidaId(event.target.value)}
            >
              <NativeSelectOption value="">
                {opciones.length === 0 ? "No hay aulas libres en esa franja" : "Elegí un aula"}
              </NativeSelectOption>
              {opciones.map(({ aula, faltantes }) => (
                <NativeSelectOption key={aula.id} value={aula.id}>
                  {faltantes.length > 0
                    ? `${describirAula(aula)} · ${faltantes.join(", ")}`
                    : describirAula(aula)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!aulaId || Boolean(errorAlumnos) || pending}
            onClick={() => void enviar(aulaId)}
          >
            {pending ? <Spinner /> : null}
            Asignar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
