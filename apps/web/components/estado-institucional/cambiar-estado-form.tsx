"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CambioEstadoInstitucionalDto } from "@repo/api/client";
import {
  cambiarEstadoInstitucionalSchema,
  estadoInstitucionLabels,
  estadoInstitucionSchema,
  type CambiarEstadoInstitucional,
  type CambiarEstadoInstitucionalInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { DateTimeInput } from "@repo/ui/components/datetime-input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { OfrecerAvisoDialog } from "@/components/avisos/ofrecer-aviso-dialog";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import {
  useCambiarEstadoInstitucional,
  useEstadoInstitucional,
} from "@/hooks/use-estado-institucional";
import { ofreceAviso, type CambioDeEstado } from "@/lib/aviso-precargado";
import { isoArgentinoAInput } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

const motivoMax = 280;

const resumenDelCambio = (cambio: CambioEstadoInstitucionalDto) => {
  if (cambio.clasesSuspendidas > 0) {
    return `Estado registrado. ${cambio.clasesSuspendidas} clases pasaron a Suspendida`;
  }
  if (cambio.clasesReanudadas > 0) {
    return `Estado registrado. Se reanudaron ${cambio.clasesReanudadas} clases`;
  }
  return "Estado registrado";
};

const valoresIniciales = (estado: CambiarEstadoInstitucional["estado"]) => ({
  estado,
  motivo: "",
  vigenciaHasta: "",
  reanudarClases: true,
});

// El `datetime-local` entrega "2026-10-14T23:30" sin zona: es hora argentina (DAT-1).
const aIsoArgentino = (value: unknown) =>
  typeof value === "string" && value ? `${value}:00-03:00` : null;

export function CambiarEstadoForm() {
  const estadoActual = useEstadoInstitucional();
  const cambiar = useCambiarEstadoInstitucional();
  const [pendiente, setPendiente] = useState<CambiarEstadoInstitucional | null>(null);
  const [avisoOfrecido, setAvisoOfrecido] = useState<CambioDeEstado | null>(null);
  const form = useForm<CambiarEstadoInstitucionalInput, unknown, CambiarEstadoInstitucional>({
    resolver: zodResolver(cambiarEstadoInstitucionalSchema),
    defaultValues: valoresIniciales("ABIERTA"),
  });
  const estadoElegido = form.watch("estado");
  const motivo = form.watch("motivo") ?? "";
  const mismoEstado = estadoActual.data?.estado === estadoElegido;
  const reabre = estadoActual.data?.estado === "CERRADA" && estadoElegido !== "CERRADA";

  const enviar = async (values: CambiarEstadoInstitucional) => {
    try {
      const cambio = await cambiar.mutateAsync(values);
      toast.success(resumenDelCambio(cambio));
      form.reset(valoresIniciales(values.estado));
      setPendiente(null);
      const registrado = cambio.estado;
      if (ofreceAviso(registrado.estado)) {
        setAvisoOfrecido({ ...registrado, estado: registrado.estado });
      }
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  // Cerrar tiene impacto sobre las clases: pide confirmación (CUR-08).
  const onSubmit = (values: CambiarEstadoInstitucional) => {
    const cambio = { ...values, reanudarClases: reabre && values.reanudarClases === true };
    return cambio.estado === "CERRADA" ? setPendiente(cambio) : enviar(cambio);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar estado</CardTitle>
        <CardDescription>Queda registrado con fecha, hora y tu usuario.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.estado)}>
              <FieldLabel htmlFor="estado-nuevo">Nuevo estado</FieldLabel>
              <NativeSelect id="estado-nuevo" className="w-full" {...form.register("estado")}>
                {estadoInstitucionSchema.options.map((estado) => (
                  <NativeSelectOption key={estado} value={estado}>
                    {estadoInstitucionLabels[estado]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {mismoEstado ? (
                <FieldDescription>Ese ya es el estado actual.</FieldDescription>
              ) : null}
              <FieldError>{form.formState.errors.estado?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.motivo)}>
              <FieldLabel htmlFor="estado-motivo">Motivo</FieldLabel>
              <FieldDescription id="estado-motivo-ayuda">
                Obligatorio para Cerrada y Abierta con novedades. Máximo {motivoMax} caracteres.
              </FieldDescription>
              <Textarea
                id="estado-motivo"
                rows={3}
                maxLength={motivoMax}
                aria-describedby="estado-motivo-ayuda"
                {...form.register("motivo")}
              />
              <FieldDescription>
                {motivo.length} / {motivoMax}
              </FieldDescription>
              <FieldError>{form.formState.errors.motivo?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.vigenciaHasta)}>
              <FieldLabel htmlFor="estado-vigencia">Vigencia estimada hasta (opcional)</FieldLabel>
              <Controller
                control={form.control}
                name="vigenciaHasta"
                render={({ field }) => (
                  <DateTimeInput
                    id="estado-vigencia"
                    value={isoArgentinoAInput(field.value)}
                    onChange={(valor) => field.onChange(aIsoArgentino(valor))}
                    onBlur={field.onBlur}
                    horaLabel="Hora de la vigencia"
                    aria-invalid={Boolean(form.formState.errors.vigenciaHasta)}
                  />
                )}
              />
              <FieldError>{form.formState.errors.vigenciaHasta?.message}</FieldError>
            </Field>
            {reabre ? (
              <Field orientation="horizontal">
                <Controller
                  control={form.control}
                  name="reanudarClases"
                  render={({ field }) => (
                    <Checkbox
                      id="estado-reanudar"
                      checked={field.value ?? false}
                      onCheckedChange={(value) => field.onChange(value === true)}
                      aria-describedby="estado-reanudar-ayuda"
                    />
                  )}
                />
                <FieldContent>
                  <FieldLabel htmlFor="estado-reanudar">
                    Reanudar las clases suspendidas por el cierre
                  </FieldLabel>
                  <FieldDescription id="estado-reanudar-ayuda">
                    Las que todavía no terminaron vuelven al estado que tenían antes del cierre.
                  </FieldDescription>
                </FieldContent>
              </Field>
            ) : null}
          </FieldGroup>
          <div className="flex justify-end">
            <Button type="submit" disabled={cambiar.isPending || mismoEstado || !estadoActual.data}>
              {cambiar.isPending ? <Spinner /> : null}
              Cambiar estado
            </Button>
          </div>
        </form>
      </CardContent>
      {pendiente ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendiente(null)}
          title="¿Cerrar la institución?"
          description="Las clases programadas durante el cierre pasarán a Suspendida y el estado se verá en todas las pantallas en menos de 60 segundos."
          confirmLabel="Cerrar la institución"
          pending={cambiar.isPending}
          onConfirm={() => void enviar(pendiente)}
        />
      ) : null}
      {avisoOfrecido ? (
        <OfrecerAvisoDialog cambio={avisoOfrecido} onClose={() => setAvisoOfrecido(null)} />
      ) : null}
    </Card>
  );
}
