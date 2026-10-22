"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { IncidenciaDto } from "@repo/api/client";
import {
  crearIncidenciaSchema,
  descripcionIncidenciaMax,
  elementoIncidenciaLabels,
  elementoIncidenciaSchema,
  gravedadIncidenciaLabels,
  gravedadIncidenciaSchema,
  validarFotoIncidencia,
  type CrearIncidencia,
  type CrearIncidenciaInput,
  type GravedadIncidencia,
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
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAulas } from "@/hooks/use-aulas";
import { useReportarIncidencia } from "@/hooks/use-incidencias";
import { showRequestError } from "@/lib/form-errors";

export type AulaDeIncidencia = { id: string; codigo: string };

// Con `aula` el reporte nace de un aula o de una clase (`claseId`, la que exige el Docente);
// sin ella el Bedel elige el aula.
export function ReportarIncidenciaDialog({
  aula,
  claseId,
  onClose,
  onReportada,
}: {
  aula?: AulaDeIncidencia;
  claseId?: string;
  onClose: () => void;
  onReportada?: (incidencia: IncidenciaDto) => void;
}) {
  const reportar = useReportarIncidencia();
  const aulas = useAulas(false, !aula);
  const [foto, setFoto] = useState<File | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const form = useForm<CrearIncidenciaInput, unknown, CrearIncidencia>({
    resolver: zodResolver(crearIncidenciaSchema),
    defaultValues: { aulaId: aula?.id ?? "", claseId, descripcion: "", gravedad: "LEVE" },
  });
  const errors = form.formState.errors;
  const gravedad = form.watch("gravedad") ?? "LEVE";
  const descripcion = form.watch("descripcion") ?? "";

  const elegirFoto = (file: File | null) => {
    setFoto(file);
    setErrorFoto(file ? validarFotoIncidencia(file) : null);
  };

  const guardar = async (values: CrearIncidencia) => {
    if (errorFoto) return;
    try {
      const incidencia = await reportar.mutateAsync({ input: values, foto });
      toast.success("Incidencia reportada");
      onClose();
      onReportada?.(incidencia);
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  const enviar = form.handleSubmit(guardar);

  return (
    <Dialog open onOpenChange={(open) => !open && !reportar.isPending && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Nueva incidencia</DialogTitle>
          <DialogDescription>
            {aula
              ? `Reportá un problema de infraestructura o equipamiento en ${aula.codigo}.`
              : "Reportá un problema de infraestructura o equipamiento de un aula."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
          <FieldGroup>
            {aula ? null : (
              <Field data-invalid={Boolean(errors.aulaId)}>
                <FieldLabel htmlFor="incidencia-aula">Aula</FieldLabel>
                <NativeSelect id="incidencia-aula" className="w-full" {...form.register("aulaId")}>
                  <NativeSelectOption value="">Elegí un aula</NativeSelectOption>
                  {(aulas.data ?? []).map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.codigo} · {item.edificio}, {item.piso}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{errors.aulaId?.message}</FieldError>
              </Field>
            )}
            <Field data-invalid={Boolean(errors.elemento)}>
              <FieldLabel htmlFor="incidencia-elemento">Elemento afectado</FieldLabel>
              <NativeSelect
                id="incidencia-elemento"
                className="w-full"
                {...form.register("elemento")}
              >
                <NativeSelectOption value="">Elegí el elemento</NativeSelectOption>
                {elementoIncidenciaSchema.options.map((elemento) => (
                  <NativeSelectOption key={elemento} value={elemento}>
                    {elementoIncidenciaLabels[elemento]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{errors.elemento?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="incidencia-descripcion">Descripción</FieldLabel>
              <Textarea
                id="incidencia-descripcion"
                rows={4}
                aria-invalid={Boolean(errors.descripcion)}
                {...form.register("descripcion")}
              />
              <FieldDescription>
                {descripcion.length} / {descripcionIncidenciaMax}
              </FieldDescription>
              <FieldError>{errors.descripcion?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel id="incidencia-gravedad">Gravedad</FieldLabel>
              <RadioGroup
                aria-labelledby="incidencia-gravedad"
                value={gravedad}
                onValueChange={(value) => form.setValue("gravedad", value as GravedadIncidencia)}
              >
                {gravedadIncidenciaSchema.options.map((opcion) => (
                  <Label key={opcion} className="font-normal">
                    <RadioGroupItem value={opcion} />
                    {gravedadIncidenciaLabels[opcion]}
                  </Label>
                ))}
              </RadioGroup>
            </Field>
            <Field data-invalid={Boolean(errorFoto)}>
              <FieldLabel htmlFor="incidencia-foto">
                Foto <span className="text-muted-foreground font-normal">(opcional)</span>
              </FieldLabel>
              <Input
                id="incidencia-foto"
                type="file"
                accept="image/jpeg,image/png"
                aria-invalid={Boolean(errorFoto)}
                onChange={(event) => elegirFoto(event.target.files?.[0] ?? null)}
              />
              <FieldDescription>JPG o PNG de hasta 5 MB.</FieldDescription>
              <FieldError>{errorFoto}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={reportar.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={reportar.isPending}>
              {reportar.isPending ? <Spinner /> : null}
              Reportar
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
