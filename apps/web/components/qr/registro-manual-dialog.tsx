"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ClaseDto } from "@repo/api/client";
import {
  fechaArgentina,
  horaArgentina,
  motivoRegistroManualMax,
  registroManualSchema,
  type RegistroManualInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { TimeInput } from "@repo/ui/components/time-input";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useRegistrarAsistenciaManual } from "@/hooks/use-asistencias";
import { useClases } from "@/hooks/use-clases";
import { showRequestError } from "@/lib/form-errors";

const estadosPendientes: ClaseDto["estado"][] = ["PROGRAMADA", "DEMORADA"];

const etiquetaClase = (clase: ClaseDto) =>
  `${clase.materia.nombre} ${clase.comision.codigo} · ${clase.horaInicio}–${clase.horaFin} · ${clase.aula?.codigo ?? "Sin aula"}`;

// RF-18: las clases de hoy que esperan asistencia, o sea Programadas o Demoradas cuya franja no terminó.
const clasesPendientes = (clases: ClaseDto[] | undefined) => {
  const ahora = Date.now();
  return (clases ?? []).filter(
    (clase) => estadosPendientes.includes(clase.estado) && new Date(clase.fin).getTime() > ahora,
  );
};

export function RegistroManualDialog({ onClose }: { onClose: () => void }) {
  const clases = useClases({ ambito: "todas", fecha: fechaArgentina(new Date()) });
  const registrar = useRegistrarAsistenciaManual();
  const pendientes = clasesPendientes(clases.data?.clases);
  const form = useForm<RegistroManualInput>({
    resolver: zodResolver(registroManualSchema),
    defaultValues: {
      claseId: "",
      docenteId: "",
      horaLlegada: horaArgentina(new Date()),
      motivo: "",
    },
  });
  const claseId = form.watch("claseId");
  const motivo = form.watch("motivo");
  const docentes = pendientes.find((clase) => clase.id === claseId)?.docentes ?? [];

  useEffect(() => {
    form.setValue("docenteId", docentes.length === 1 ? docentes[0].id : "");
    // Solo al cambiar de clase; `docentes` se recalcula en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claseId]);

  const onSubmit = async (input: RegistroManualInput) => {
    try {
      await registrar.mutateAsync(input);
      toast.success("Asistencia registrada. La clase quedó en Docente presente.");
      onClose();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  const errors = form.formState.errors;
  return (
    <Dialog open onOpenChange={(open) => !open && !registrar.isPending && onClose()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Registro manual</DialogTitle>
          <DialogDescription>
            Para cuando el docente no puede usar el QR. Queda registrado a tu nombre.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.claseId)}>
              <FieldLabel htmlFor="registro-clase">Clase</FieldLabel>
              <NativeSelect id="registro-clase" className="w-full" {...form.register("claseId")}>
                <NativeSelectOption value="">Seleccionar clase</NativeSelectOption>
                {pendientes.map((clase) => (
                  <NativeSelectOption key={clase.id} value={clase.id}>
                    {etiquetaClase(clase)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {clases.data && pendientes.length === 0 ? (
                <FieldDescription>No hay clases de hoy pendientes de asistencia</FieldDescription>
              ) : null}
              <FieldError>{errors.claseId?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.docenteId)}>
              <FieldLabel htmlFor="registro-docente">Docente</FieldLabel>
              <NativeSelect
                id="registro-docente"
                className="w-full"
                {...form.register("docenteId")}
              >
                <NativeSelectOption value="">Seleccionar docente</NativeSelectOption>
                {docentes.map((docente) => (
                  <NativeSelectOption key={docente.id} value={docente.id}>
                    {docente.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{errors.docenteId?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.horaLlegada)}>
              <FieldLabel htmlFor="registro-hora">Hora de llegada</FieldLabel>
              <Controller
                control={form.control}
                name="horaLlegada"
                render={({ field }) => (
                  <TimeInput
                    id="registro-hora"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errors.horaLlegada)}
                  />
                )}
              />
              <FieldError>{errors.horaLlegada?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.motivo)}>
              <FieldLabel htmlFor="registro-motivo">Motivo</FieldLabel>
              <Textarea id="registro-motivo" rows={3} {...form.register("motivo")} />
              <FieldDescription>
                {motivo.length} / {motivoRegistroManualMax}
              </FieldDescription>
              <FieldError>{errors.motivo?.message}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={registrar.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={registrar.isPending}>
              {registrar.isPending ? <Spinner /> : null}
              Registrar asistencia
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
