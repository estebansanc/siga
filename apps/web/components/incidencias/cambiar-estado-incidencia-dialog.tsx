"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { IncidenciaDto } from "@repo/api/client";
import {
  cambiarEstadoIncidenciaSchema,
  estadoIncidenciaLabels,
  observacionesIncidenciaMax,
  type CambiarEstadoIncidencia,
  type CambiarEstadoIncidenciaInput,
  type EstadoIncidencia,
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useCambiarEstadoIncidencia } from "@/hooks/use-incidencias";
import { showRequestError } from "@/lib/form-errors";

export function CambiarEstadoIncidenciaDialog({
  incidencia,
  estado,
  onClose,
}: {
  incidencia: IncidenciaDto;
  estado: EstadoIncidencia;
  onClose: () => void;
}) {
  const cambiar = useCambiarEstadoIncidencia(incidencia.id);
  const form = useForm<CambiarEstadoIncidenciaInput, unknown, CambiarEstadoIncidencia>({
    resolver: zodResolver(cambiarEstadoIncidenciaSchema),
    defaultValues: { estado, observaciones: "", rehabilitarAula: false },
  });
  const errors = form.formState.errors;
  const observaciones = form.watch("observaciones") ?? "";
  const puedeRehabilitar = estado === "RESUELTA" && incidencia.aula.estado !== "DISPONIBLE";

  const guardar = async (values: CambiarEstadoIncidencia) => {
    try {
      await cambiar.mutateAsync(values);
      toast.success(`Incidencia ${estadoIncidenciaLabels[estado].toLowerCase()}`);
      onClose();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !cambiar.isPending && onClose()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>
            {estado === "RESUELTA" ? "Resolver incidencia" : "Pasar incidencia a En curso"}
          </DialogTitle>
          <DialogDescription>
            {incidencia.aula.codigo}: el cambio queda en el historial con tu usuario. No se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(guardar)} className="flex flex-col gap-4">
          <Field data-invalid={Boolean(errors.observaciones)}>
            <FieldLabel htmlFor="incidencia-observaciones">
              Observaciones{" "}
              <span className="text-muted-foreground font-normal">
                (opcional, máx. {observacionesIncidenciaMax})
              </span>
            </FieldLabel>
            <Textarea
              id="incidencia-observaciones"
              rows={3}
              maxLength={observacionesIncidenciaMax}
              {...form.register("observaciones")}
            />
            <FieldDescription>
              {observaciones.length} / {observacionesIncidenciaMax}
            </FieldDescription>
            <FieldError>{errors.observaciones?.message}</FieldError>
          </Field>
          {puedeRehabilitar ? (
            <Label className="font-normal">
              <Checkbox
                checked={form.watch("rehabilitarAula")}
                onCheckedChange={(value) => form.setValue("rehabilitarAula", value === true)}
              />
              Rehabilitar el aula (pasar {incidencia.aula.codigo} a Disponible)
            </Label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={cambiar.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cambiar.isPending}>
              {cambiar.isPending ? <Spinner /> : null}
              {estado === "RESUELTA" ? "Resolver" : "Pasar a En curso"}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
