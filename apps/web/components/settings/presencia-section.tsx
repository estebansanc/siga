"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  latitudSchema,
  longitudSchema,
  presenciaSchema,
  radioMetrosSchema,
  redesDesdeTexto,
  type Presencia,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { showRequestError } from "@/lib/form-errors";

const formSchema = z.object({
  latitud: latitudSchema,
  longitud: longitudSchema,
  radioMetros: radioMetrosSchema,
  redes: z.string().superRefine((texto, ctx) => {
    const redes = presenciaSchema.shape.redes.safeParse(redesDesdeTexto(texto));
    if (!redes.success) ctx.addIssue({ code: "custom", message: redes.error.issues[0]?.message });
  }),
});
type FormValues = z.infer<typeof formSchema>;

const aValores = (presencia: Presencia): FormValues => ({
  ...presencia,
  redes: presencia.redes.join("\n"),
});

export function PresenciaSection() {
  const settings = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presencia del docente</CardTitle>
        <CardDescription>
          Dónde tiene que estar el docente al registrar su asistencia por QR: dentro del radio de la
          sede o, si no hay ubicación, en la red institucional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.data ? (
          <PresenciaForm presencia={settings.data.presencia} />
        ) : (
          <Skeleton className="h-56 w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function PresenciaForm({ presencia }: { presencia: Presencia }) {
  const updateSettings = useUpdateSettings();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: aValores(presencia),
  });
  const { errors } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateSettings.mutateAsync({
        presencia: { ...values, redes: redesDesdeTexto(values.redes) },
      });
      form.reset(values);
      toast.success("Presencia actualizada");
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.latitud)}>
            <FieldLabel htmlFor="presencia-latitud">Latitud</FieldLabel>
            <Input
              id="presencia-latitud"
              type="number"
              step="any"
              {...form.register("latitud", { valueAsNumber: true })}
            />
            <FieldError>{errors.latitud?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.longitud)}>
            <FieldLabel htmlFor="presencia-longitud">Longitud</FieldLabel>
            <Input
              id="presencia-longitud"
              type="number"
              step="any"
              {...form.register("longitud", { valueAsNumber: true })}
            />
            <FieldError>{errors.longitud?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.radioMetros)}>
            <FieldLabel htmlFor="presencia-radio">Radio (metros)</FieldLabel>
            <Input
              id="presencia-radio"
              type="number"
              step="any"
              {...form.register("radioMetros", { valueAsNumber: true })}
            />
            <FieldError>{errors.radioMetros?.message}</FieldError>
          </Field>
        </div>
        <Field data-invalid={Boolean(errors.redes)}>
          <FieldLabel htmlFor="presencia-redes">Red institucional</FieldLabel>
          <Textarea
            id="presencia-redes"
            rows={3}
            placeholder="200.45.10.0/24"
            {...form.register("redes")}
          />
          <FieldDescription>
            Un rango CIDR IPv4 por línea (por ahora no se admite IPv6). Vacía, solo vale la
            ubicación.
          </FieldDescription>
          <FieldError>{errors.redes?.message}</FieldError>
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        disabled={updateSettings.isPending || !form.formState.isDirty}
        className="w-fit self-end"
      >
        {updateSettings.isPending ? <Spinner /> : null}
        Guardar presencia
      </Button>
    </form>
  );
}
