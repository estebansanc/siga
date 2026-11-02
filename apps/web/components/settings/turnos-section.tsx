"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { turnoLabels, turnosEnOrden, turnosSchema, type Turnos } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { TimeInput } from "@repo/ui/components/time-input";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { showRequestError } from "@/lib/form-errors";

export function TurnosSection() {
  const settings = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turnos</CardTitle>
        <CardDescription>
          Los rangos horarios de Mañana, Tarde y Noche. Asistencia docente los usa para elegir las
          clases de cada turno.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.data ? (
          <TurnosForm turnos={settings.data.turnos} />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function TurnosForm({ turnos }: { turnos: Turnos }) {
  const updateSettings = useUpdateSettings();
  const form = useForm<Turnos>({
    resolver: zodResolver(turnosSchema),
    defaultValues: turnos,
  });

  const onSubmit = async (values: Turnos) => {
    try {
      await updateSettings.mutateAsync({ turnos: values });
      form.reset(values);
      toast.success("Turnos actualizados");
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        {turnosEnOrden.map((turno) => (
          <div key={turno} className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors[turno]?.inicio)}>
              <FieldLabel htmlFor={`turno-${turno}-inicio`}>
                {turnoLabels[turno]}: inicio
              </FieldLabel>
              <Controller
                control={form.control}
                name={`${turno}.inicio`}
                render={({ field }) => (
                  <TimeInput
                    id={`turno-${turno}-inicio`}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(form.formState.errors[turno]?.inicio)}
                  />
                )}
              />
              <FieldError>{form.formState.errors[turno]?.inicio?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors[turno]?.fin)}>
              <FieldLabel htmlFor={`turno-${turno}-fin`}>{turnoLabels[turno]}: fin</FieldLabel>
              <Controller
                control={form.control}
                name={`${turno}.fin`}
                render={({ field }) => (
                  <TimeInput
                    id={`turno-${turno}-fin`}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(form.formState.errors[turno]?.fin)}
                  />
                )}
              />
              <FieldError>{form.formState.errors[turno]?.fin?.message}</FieldError>
            </Field>
          </div>
        ))}
      </FieldGroup>
      <Button
        type="submit"
        disabled={updateSettings.isPending || !form.formState.isDirty}
        className="w-fit self-end"
      >
        {updateSettings.isPending ? <Spinner /> : null}
        Guardar turnos
      </Button>
    </form>
  );
}
