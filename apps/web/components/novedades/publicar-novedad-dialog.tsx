"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ClaseDto } from "@repo/api/client";
import {
  fechaArgentina,
  publicarNovedadSchema,
  tipoNovedadLabels,
  tipoNovedadSchema,
  type PublicarNovedad,
  type PublicarNovedadInput,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
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
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EstadoClaseBadge } from "@/components/clases/estado-clase-badge";
import { FormDialogContent } from "@/components/form-dialog-content";
import { useClases } from "@/hooks/use-clases";
import { useAulasDisponibles, usePublicarNovedad } from "@/hooks/use-novedades";
import { formatFechaCorta } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

const mensajeMax = 500;
const seleccionable = (clase: ClaseDto) =>
  !["AUSENTE", "SUSPENDIDA", "FINALIZADA"].includes(clase.estado);

const describirClase = (clase: ClaseDto) =>
  `${clase.materia.nombre} · ${clase.comision.codigo} · ${formatFechaCorta(clase.fecha)} ${clase.horaInicio}`;

// Clases de un día para elegir, con casillas; las finalizadas no se pueden seleccionar (CUR-05).
function ClasesDelDiaSeleccionables({
  fecha,
  seleccionadas,
  onToggle,
}: {
  fecha: string;
  seleccionadas: ClaseDto[];
  onToggle: (clase: ClaseDto, checked: boolean) => void;
}) {
  const clases = useClases({ ambito: "mias", fecha });
  if (!clases.data) return <Skeleton className="h-20 w-full" />;
  if (clases.data.clases.length === 0) {
    return <p className="text-muted-foreground text-sm">No tenés clases ese día.</p>;
  }
  return (
    <ItemGroup className="gap-2">
      {clases.data.clases.map((clase) => {
        const checked = seleccionadas.some((item) => item.id === clase.id);
        const disabled = !seleccionable(clase);
        return (
          <Item key={clase.id} variant="outline" size="sm" className="gap-3">
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) => onToggle(clase, value === true)}
              aria-label={describirClase(clase)}
            />
            <ItemContent>
              <ItemTitle>
                {clase.materia.nombre}
                <Badge variant="secondary">{clase.comision.codigo}</Badge>
              </ItemTitle>
              <ItemDescription className="flex flex-wrap items-center gap-2">
                {clase.horaInicio} – {clase.horaFin}
                <EstadoClaseBadge clase={clase} />
              </ItemDescription>
            </ItemContent>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

// Publicar una novedad en 3 pasos y menos de 1 minuto (US-2): clases, tipo, detalle.
export function PublicarNovedadDialog({
  open,
  onOpenChange,
  claseInicial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claseInicial?: ClaseDto;
}) {
  const publicar = usePublicarNovedad();
  const [fecha, setFecha] = useState(() => claseInicial?.fecha ?? fechaArgentina(new Date()));
  const [seleccionadas, setSeleccionadas] = useState<ClaseDto[]>(() =>
    claseInicial ? [claseInicial] : [],
  );
  const form = useForm<PublicarNovedadInput, unknown, PublicarNovedad>({
    resolver: zodResolver(publicarNovedadSchema),
    defaultValues: {
      claseIds: claseInicial ? [claseInicial.id] : [],
      tipo: "DEMORA",
      minutosDemora: "",
      enlaceVirtual: "",
      aulaNuevaId: "",
      mensaje: "",
    },
  });
  const tipo = form.watch("tipo");
  const mensaje = form.watch("mensaje") ?? "";
  const claseIds = seleccionadas.map((clase) => clase.id);
  const aulas = useAulasDisponibles(tipo === "CAMBIO_AULA" ? claseIds : []);
  const errors = form.formState.errors;

  const toggleClase = (clase: ClaseDto, checked: boolean) => {
    const siguientes = checked
      ? [...seleccionadas.filter((item) => item.id !== clase.id), clase]
      : seleccionadas.filter((item) => item.id !== clase.id);
    setSeleccionadas(siguientes);
    form.setValue(
      "claseIds",
      siguientes.map((item) => item.id),
      { shouldValidate: form.formState.isSubmitted },
    );
  };

  const close = () => {
    form.reset();
    setSeleccionadas(claseInicial ? [claseInicial] : []);
    onOpenChange(false);
  };

  const onSubmit = async (values: PublicarNovedad) => {
    try {
      await publicar.mutateAsync(values);
      toast.success("Novedad publicada");
      close();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !publicar.isPending && close()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Publicar novedad</DialogTitle>
          <DialogDescription>
            Se publica en menos de 60 segundos para quienes siguen la comisión.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.claseIds)}>
              <FieldLabel>1. Clases afectadas</FieldLabel>
              {seleccionadas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Clases seleccionadas">
                  {seleccionadas.map((clase) => (
                    <Badge key={clase.id} variant="secondary" className="gap-1 pr-1">
                      {describirClase(clase)}
                      <button
                        type="button"
                        className="hover:bg-muted rounded-full"
                        aria-label={`Quitar ${describirClase(clase)}`}
                        onClick={() => toggleClase(clase, false)}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <FieldDescription>Elegí una o más clases de la misma comisión.</FieldDescription>
              )}
              <div className="flex flex-col gap-2">
                <Input
                  type="date"
                  aria-label="Fecha de las clases"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                  className="w-fit"
                />
                {fecha ? (
                  <ClasesDelDiaSeleccionables
                    fecha={fecha}
                    seleccionadas={seleccionadas}
                    onToggle={toggleClase}
                  />
                ) : null}
              </div>
              <FieldError>{errors.claseIds?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.tipo)}>
              <FieldLabel>2. Tipo de novedad</FieldLabel>
              <ToggleGroup
                variant="outline"
                value={[tipo]}
                onValueChange={(value: string[]) => {
                  const siguiente = tipoNovedadSchema.safeParse(value.at(-1));
                  if (siguiente.success) {
                    form.setValue("tipo", siguiente.data, { shouldValidate: true });
                  }
                }}
                className="flex-wrap"
                aria-label="Tipo de novedad"
              >
                {tipoNovedadSchema.options.map((opcion) => (
                  <ToggleGroupItem key={opcion} value={opcion}>
                    {tipoNovedadLabels[opcion]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldError>{errors.tipo?.message}</FieldError>
            </Field>

            <FieldLabel>3. Detalle</FieldLabel>
            {tipo === "DEMORA" ? (
              <Field data-invalid={Boolean(errors.minutosDemora)}>
                <FieldLabel htmlFor="novedad-minutos">Minutos estimados de demora</FieldLabel>
                <Input
                  id="novedad-minutos"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  {...form.register("minutosDemora")}
                />
                <FieldError>{errors.minutosDemora?.message}</FieldError>
              </Field>
            ) : null}
            {tipo === "VIRTUAL" ? (
              <Field data-invalid={Boolean(errors.enlaceVirtual)}>
                <FieldLabel htmlFor="novedad-enlace">Enlace de la clase virtual</FieldLabel>
                <Input
                  id="novedad-enlace"
                  type="url"
                  placeholder="https://"
                  {...form.register("enlaceVirtual")}
                />
                <FieldError>{errors.enlaceVirtual?.message}</FieldError>
              </Field>
            ) : null}
            {tipo === "CAMBIO_AULA" ? (
              <Field data-invalid={Boolean(errors.aulaNuevaId)}>
                <FieldLabel htmlFor="novedad-aula">Aula nueva</FieldLabel>
                <NativeSelect
                  id="novedad-aula"
                  className="w-full"
                  disabled={claseIds.length === 0}
                  {...form.register("aulaNuevaId")}
                >
                  <NativeSelectOption value="">
                    {claseIds.length === 0
                      ? "Elegí primero las clases"
                      : "Elegí un aula disponible"}
                  </NativeSelectOption>
                  {aulas.data?.map((aula) => (
                    <NativeSelectOption key={aula.id} value={aula.id}>
                      {aula.codigo} · {aula.edificio}, {aula.piso} · {aula.capacidad} lugares
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {aulas.data?.length === 0 ? (
                  <FieldDescription>No hay aulas libres en esa franja.</FieldDescription>
                ) : null}
                <FieldError>{errors.aulaNuevaId?.message}</FieldError>
              </Field>
            ) : null}
            <Field data-invalid={Boolean(errors.mensaje)}>
              <FieldLabel htmlFor="novedad-mensaje">
                Mensaje para los estudiantes{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional, máx. {mensajeMax})
                </span>
              </FieldLabel>
              <Textarea
                id="novedad-mensaje"
                rows={3}
                maxLength={mensajeMax}
                {...form.register("mensaje")}
              />
              <FieldDescription>
                {mensaje.length} / {mensajeMax}
              </FieldDescription>
              <FieldError>{errors.mensaje?.message}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={publicar.isPending} onClick={close}>
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
