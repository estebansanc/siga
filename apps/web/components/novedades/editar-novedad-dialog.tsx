"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { NovedadDto } from "@repo/api/client";
import {
  campoEditablePorTipo,
  editarNovedadSchemaPara,
  tipoNovedadLabels,
  type EditarNovedad,
  type EditarNovedadInput,
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
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAulasDisponibles, useEditarNovedad } from "@/hooks/use-novedades";
import { showRequestError } from "@/lib/form-errors";

const mensajeMax = 500;

// Editar una novedad activa (RF-05): solo el dato propio del tipo y el mensaje; el tipo y las
// clases no cambian. Las clases que ya terminaron no se tocan.
export function EditarNovedadDialog({
  novedad,
  open,
  onOpenChange,
}: {
  novedad: NovedadDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editar = useEditarNovedad(novedad.id);
  const campo = campoEditablePorTipo[novedad.tipo];
  const form = useForm<EditarNovedadInput, unknown, EditarNovedad>({
    resolver: zodResolver(editarNovedadSchemaPara(novedad.tipo)),
    defaultValues: {
      minutosDemora: novedad.minutosDemora ?? "",
      enlaceVirtual: novedad.enlaceVirtual ?? "",
      aulaNuevaId: novedad.aulaNueva?.id ?? "",
      mensaje: novedad.mensaje ?? "",
    },
  });
  const claseIds = novedad.clases
    .filter((clase) => clase.estado !== "FINALIZADA")
    .map((clase) => clase.id);
  const aulas = useAulasDisponibles(campo === "aulaNuevaId" ? claseIds : []);
  const mensaje = form.watch("mensaje") ?? "";
  const errors = form.formState.errors;

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: EditarNovedad) => {
    try {
      await editar.mutateAsync(values);
      toast.success("Novedad actualizada");
      close();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !editar.isPending && close()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>
            Editar novedad · {tipoNovedadLabels[novedad.tipo]} de {novedad.comision.codigo}
          </DialogTitle>
          <DialogDescription>
            El tipo y las clases no se modifican. La publicación original queda en el historial de
            la clase.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup>
            {campo === "minutosDemora" ? (
              <Field data-invalid={Boolean(errors.minutosDemora)}>
                <FieldLabel htmlFor="editar-novedad-minutos">
                  Minutos estimados de demora
                </FieldLabel>
                <Input
                  id="editar-novedad-minutos"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  {...form.register("minutosDemora")}
                />
                <FieldError>{errors.minutosDemora?.message}</FieldError>
              </Field>
            ) : null}
            {campo === "enlaceVirtual" ? (
              <Field data-invalid={Boolean(errors.enlaceVirtual)}>
                <FieldLabel htmlFor="editar-novedad-enlace">Enlace de la clase virtual</FieldLabel>
                <Input
                  id="editar-novedad-enlace"
                  type="url"
                  placeholder="https://"
                  {...form.register("enlaceVirtual")}
                />
                <FieldError>{errors.enlaceVirtual?.message}</FieldError>
              </Field>
            ) : null}
            {campo === "aulaNuevaId" ? (
              <Field data-invalid={Boolean(errors.aulaNuevaId)}>
                <FieldLabel htmlFor="editar-novedad-aula">Aula nueva</FieldLabel>
                <NativeSelect
                  id="editar-novedad-aula"
                  className="w-full"
                  {...form.register("aulaNuevaId")}
                >
                  <NativeSelectOption value="">Elegí un aula disponible</NativeSelectOption>
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
              <FieldLabel htmlFor="editar-novedad-mensaje">
                Mensaje para los estudiantes{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional, máx. {mensajeMax})
                </span>
              </FieldLabel>
              <Textarea
                id="editar-novedad-mensaje"
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
            <Button type="button" variant="outline" disabled={editar.isPending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={editar.isPending}>
              {editar.isPending ? <Spinner /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
