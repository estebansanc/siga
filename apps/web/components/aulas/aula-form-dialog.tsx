"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AulaGestionDto } from "@repo/api/client";
import {
  capacidadAulaMax,
  capacidadAulaMin,
  crearAulaSchema,
  equipamientoLabels,
  equipamientoSchema,
  estadoAulaLabels,
  estadoAulaSchema,
  observacionesAulaMax,
  type CrearAula,
  type CrearAulaInput,
  type Equipamiento,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
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
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useActualizarAula, useAula, useCrearAula } from "@/hooks/use-aulas";
import { RequestError } from "@/lib/api-client";
import { showRequestError } from "@/lib/form-errors";

import { AulaClasesList } from "./aula-clases-list";

const valoresIniciales = (aula?: AulaGestionDto): CrearAulaInput => ({
  codigo: aula?.codigo ?? "",
  edificio: aula?.edificio ?? "",
  piso: aula?.piso ?? "",
  capacidad: aula?.capacidad ?? "",
  equipamiento: (aula?.equipamiento ?? []) as Equipamiento[],
  estado: aula?.estado ?? "DISPONIBLE",
  observaciones: aula?.observaciones ?? "",
});

// Alta (sin `aula`) y edición. "Ocupada" no es una opción: se calcula con las clases en curso.
export function AulaFormDialog({ aula, onClose }: { aula?: AulaGestionDto; onClose: () => void }) {
  const crear = useCrearAula();
  const actualizar = useActualizarAula(aula?.id ?? "");
  const detalle = useAula(aula?.id ?? "");
  const [pendiente, setPendiente] = useState<CrearAula | null>(null);
  const form = useForm<CrearAulaInput, unknown, CrearAula>({
    resolver: zodResolver(crearAulaSchema),
    defaultValues: valoresIniciales(aula),
  });
  const errors = form.formState.errors;
  const equipamiento = form.watch("equipamiento") ?? [];
  const observaciones = form.watch("observaciones") ?? "";
  const guardando = crear.isPending || actualizar.isPending;
  const cargandoDetalle = Boolean(aula) && !detalle.data;
  const afectadas = detalle.data?.clasesAfectadas ?? [];

  const guardar = async (values: CrearAula) => {
    try {
      if (aula) await actualizar.mutateAsync(values);
      else await crear.mutateAsync(values);
      toast.success(aula ? "Aula actualizada" : "Aula creada");
      onClose();
    } catch (error) {
      setPendiente(null);
      if (error instanceof RequestError && error.status === 409) {
        form.setError("codigo", { message: error.message });
        return;
      }
      showRequestError(error, form.setError);
    }
  };

  // Sacar de servicio un aula con clases sin terminar pide confirmar viendo cuáles son.
  const sacaDeServicio = (values: CrearAula) =>
    Boolean(aula) &&
    values.estado !== "DISPONIBLE" &&
    values.estado !== aula?.estado &&
    afectadas.length > 0;

  const onSubmit = (values: CrearAula) =>
    sacaDeServicio(values) ? setPendiente(values) : guardar(values);

  const toggleEquipamiento = (item: Equipamiento, checked: boolean) =>
    form.setValue(
      "equipamiento",
      checked ? [...equipamiento, item] : equipamiento.filter((actual) => actual !== item),
    );

  return (
    <Dialog open onOpenChange={(open) => !open && !guardando && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{aula ? `Editar ${aula.codigo}` : "Nueva aula"}</DialogTitle>
          <DialogDescription>
            Los cambios se ven en los listados en menos de 60 segundos y quedan en auditoría.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.codigo)}>
              <FieldLabel htmlFor="aula-codigo">Código</FieldLabel>
              <Input id="aula-codigo" {...form.register("codigo")} />
              <FieldError>{errors.codigo?.message}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.edificio)}>
                <FieldLabel htmlFor="aula-edificio">Edificio</FieldLabel>
                <Input id="aula-edificio" {...form.register("edificio")} />
                <FieldError>{errors.edificio?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.piso)}>
                <FieldLabel htmlFor="aula-piso">Piso</FieldLabel>
                <Input id="aula-piso" {...form.register("piso")} />
                <FieldError>{errors.piso?.message}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.capacidad)}>
                <FieldLabel htmlFor="aula-capacidad">Capacidad</FieldLabel>
                <Input
                  id="aula-capacidad"
                  type="number"
                  inputMode="numeric"
                  min={capacidadAulaMin}
                  max={capacidadAulaMax}
                  {...form.register("capacidad")}
                />
                <FieldError>{errors.capacidad?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.estado)}>
                <FieldLabel htmlFor="aula-estado">Estado</FieldLabel>
                <NativeSelect id="aula-estado" className="w-full" {...form.register("estado")}>
                  {estadoAulaSchema.options.map((estado) => (
                    <NativeSelectOption key={estado} value={estado}>
                      {estadoAulaLabels[estado]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{errors.estado?.message}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel>Equipamiento</FieldLabel>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Equipamiento">
                {equipamientoSchema.options.map((item) => (
                  <Label key={item} className="font-normal">
                    <Checkbox
                      checked={equipamiento.includes(item)}
                      onCheckedChange={(value) => toggleEquipamiento(item, value === true)}
                    />
                    {equipamientoLabels[item]}
                  </Label>
                ))}
              </div>
            </Field>
            <Field data-invalid={Boolean(errors.observaciones)}>
              <FieldLabel htmlFor="aula-observaciones">
                Observaciones{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional, máx. {observacionesAulaMax})
                </span>
              </FieldLabel>
              <Textarea
                id="aula-observaciones"
                rows={3}
                maxLength={observacionesAulaMax}
                {...form.register("observaciones")}
              />
              <FieldDescription>
                {observaciones.length} / {observacionesAulaMax}
              </FieldDescription>
              <FieldError>{errors.observaciones?.message}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={guardando} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || cargandoDetalle}>
              {guardando ? <Spinner /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
      {pendiente ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendiente(null)}
          title={`¿Pasar ${aula?.codigo} a ${estadoAulaLabels[pendiente.estado]}?`}
          description="Las clases asignadas conservan el aula hasta que las reasignes. Dejará de ofrecerse en Cambio de aula."
          confirmLabel="Confirmar"
          pending={guardando}
          onConfirm={() => void guardar(pendiente)}
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {afectadas.length} {afectadas.length === 1 ? "clase afectada" : "clases afectadas"}:
            </p>
            <AulaClasesList clases={afectadas} vacio="" />
          </div>
        </ConfirmDialog>
      ) : null}
    </Dialog>
  );
}
