"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  crearAvisoSchema,
  fechaArgentina,
  horaArgentina,
  perfilLabels,
  perfilSchema,
  prioridadAvisoLabels,
  prioridadAvisoSchema,
  segmentoVacio,
  type AvisoPrecargado,
  type CrearAviso,
  type CrearAvisoInput,
  type SegmentoAviso,
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
  FieldLegend,
  FieldSet,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { usePublicarAviso } from "@/hooks/use-avisos";
import { useCarreras, useComisiones } from "@/hooks/use-datos-academicos";
import { inputArgentinoAIso } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

const tituloMax = 100;
const cuerpoMax = 2000;
const anios = [1, 2, 3, 4, 5, 6];

const ahoraEnInput = () => {
  const ahora = new Date();
  return `${fechaArgentina(ahora)}T${horaArgentina(ahora)}`;
};

const alternar = <T,>(valores: T[], valor: T, marcado: boolean) =>
  marcado
    ? [...valores.filter((item) => item !== valor), valor]
    : valores.filter((item) => item !== valor);

type CriterioProps<T> = {
  legend: string;
  opciones: { valor: T; label: string }[];
  seleccion: T[];
  onChange: (seleccion: T[]) => void;
};

function Criterio<T extends string | number>({
  legend,
  opciones,
  seleccion,
  onChange,
}: CriterioProps<T>) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
        {opciones.map(({ valor, label }) => (
          <Field key={String(valor)} orientation="horizontal">
            <Checkbox
              id={`aviso-${legend}-${String(valor)}`}
              checked={seleccion.includes(valor)}
              onCheckedChange={(marcado) => onChange(alternar(seleccion, valor, marcado === true))}
            />
            <FieldLabel htmlFor={`aviso-${legend}-${String(valor)}`}>{label}</FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}

function SegmentoFields({
  segmento,
  onChange,
}: {
  segmento: SegmentoAviso;
  onChange: (segmento: SegmentoAviso) => void;
}) {
  const carreras = useCarreras();
  const comisiones = useComisiones({});
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3">
      <Criterio
        legend="Perfiles"
        opciones={perfilSchema.options.map((perfil) => ({
          valor: perfil,
          label: perfilLabels[perfil],
        }))}
        seleccion={segmento.perfiles}
        onChange={(perfiles) => onChange({ ...segmento, perfiles })}
      />
      <Criterio
        legend="Carreras"
        opciones={(carreras.data ?? []).map((carrera) => ({
          valor: carrera.id,
          label: carrera.nombre,
        }))}
        seleccion={segmento.carreraIds}
        onChange={(carreraIds) => onChange({ ...segmento, carreraIds })}
      />
      <Criterio
        legend="Años"
        opciones={anios.map((anio) => ({ valor: anio, label: `${anio}.º año` }))}
        seleccion={segmento.anios}
        onChange={(seleccionados) => onChange({ ...segmento, anios: seleccionados })}
      />
      <Criterio
        legend="Comisiones"
        opciones={(comisiones.data ?? []).map((comision) => ({
          valor: comision.id,
          label: `${comision.materia.nombre} · ${comision.codigo}`,
        }))}
        seleccion={segmento.comisionIds}
        onChange={(comisionIds) => onChange({ ...segmento, comisionIds })}
      />
    </div>
  );
}

// Nuevo aviso: llega a quien cumpla cualquiera de los criterios elegidos. Los estudiantes
// y docentes se alcanzan por las comisiones que siguen o dictan.
export function PublicarAvisoDialog({
  precargado,
  onClose,
}: {
  precargado?: AvisoPrecargado | null;
  onClose: () => void;
}) {
  const publicar = usePublicarAviso();
  const form = useForm<CrearAvisoInput, unknown, CrearAviso>({
    resolver: zodResolver(crearAvisoSchema),
    defaultValues: {
      titulo: precargado?.titulo ?? "",
      cuerpo: precargado?.cuerpo ?? "",
      prioridad: precargado?.prioridad ?? "NORMAL",
      destinatarios: { ...segmentoVacio, todos: true },
      desde: ahoraEnInput(),
      hasta: precargado?.hasta ?? "",
      enviarPorCorreo: false,
    },
  });
  const errors = form.formState.errors;
  const cuerpo = form.watch("cuerpo") ?? "";
  const segmento = form.watch("destinatarios");
  const enviarPorCorreo = form.watch("enviarPorCorreo") ?? false;

  const cambiarSegmento = (siguiente: SegmentoAviso) =>
    form.setValue("destinatarios", siguiente, { shouldValidate: form.formState.isSubmitted });

  const onSubmit = async (values: CrearAviso) => {
    try {
      await publicar.mutateAsync(values);
      toast.success("Aviso publicado");
      onClose();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !publicar.isPending && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Nuevo aviso</DialogTitle>
          <DialogDescription>
            Se ve en menos de 60 segundos para quienes lo reciben, mientras esté vigente.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.titulo)}>
              <FieldLabel htmlFor="aviso-titulo">Título</FieldLabel>
              <Input id="aviso-titulo" maxLength={tituloMax} {...form.register("titulo")} />
              <FieldError>{errors.titulo?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.cuerpo)}>
              <FieldLabel htmlFor="aviso-cuerpo">Cuerpo</FieldLabel>
              <Textarea
                id="aviso-cuerpo"
                rows={5}
                maxLength={cuerpoMax}
                {...form.register("cuerpo")}
              />
              <FieldDescription>
                {cuerpo.length} / {cuerpoMax}
              </FieldDescription>
              <FieldError>{errors.cuerpo?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.prioridad)}>
              <FieldLabel htmlFor="aviso-prioridad">Prioridad</FieldLabel>
              <NativeSelect id="aviso-prioridad" className="w-full" {...form.register("prioridad")}>
                {prioridadAvisoSchema.options.map((prioridad) => (
                  <NativeSelectOption key={prioridad} value={prioridad}>
                    {prioridadAvisoLabels[prioridad]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <FieldSet data-invalid={Boolean(errors.destinatarios)}>
              <FieldLegend variant="label">Destinatarios</FieldLegend>
              <FieldDescription>
                Lo reciben quienes cumplan al menos uno de los criterios.
              </FieldDescription>
              <Field orientation="horizontal">
                <Checkbox
                  id="aviso-todos"
                  checked={segmento.todos}
                  onCheckedChange={(marcado) =>
                    cambiarSegmento({ ...segmento, todos: marcado === true })
                  }
                />
                <FieldLabel htmlFor="aviso-todos">Todos</FieldLabel>
              </Field>
              {segmento.todos ? null : (
                <SegmentoFields segmento={segmento} onChange={cambiarSegmento} />
              )}
              <FieldError>{errors.destinatarios?.message}</FieldError>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.desde)}>
                <FieldLabel htmlFor="aviso-desde">Desde</FieldLabel>
                <Input
                  id="aviso-desde"
                  type="datetime-local"
                  {...form.register("desde", { setValueAs: inputArgentinoAIso })}
                />
                <FieldError>{errors.desde?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.hasta)}>
                <FieldLabel htmlFor="aviso-hasta">Hasta</FieldLabel>
                <Input
                  id="aviso-hasta"
                  type="datetime-local"
                  {...form.register("hasta", { setValueAs: inputArgentinoAIso })}
                />
                <FieldError>{errors.hasta?.message}</FieldError>
              </Field>
            </div>
            <Field orientation="horizontal">
              <Switch
                id="aviso-correo"
                checked={enviarPorCorreo}
                onCheckedChange={(marcado) => form.setValue("enviarPorCorreo", marcado)}
              />
              <FieldLabel htmlFor="aviso-correo">Enviar por correo</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={publicar.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={publicar.isPending}>
              {publicar.isPending ? <Spinner /> : null}
              Publicar
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
