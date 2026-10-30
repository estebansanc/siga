"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { organizationNameSchema } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { showRequestError } from "@/lib/form-errors";

// Reutiliza la regla del dominio (trim, mínimo 1, máximo 100): en `updateSettingsSchema` es
// opcional porque el PATCH admite mandar solo otros campos; acá siempre se manda el nombre.
const organizationFormSchema = z.object({ name: organizationNameSchema });
type OrganizationNameInput = z.infer<typeof organizationFormSchema>;

export function OrganizationSection() {
  const settings = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institución</CardTitle>
        <CardDescription>
          El nombre que ven todos los usuarios en la barra lateral.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.data ? (
          <OrganizationNameForm name={settings.data.name} />
        ) : (
          <Skeleton className="h-14 w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function OrganizationNameForm({ name }: { name: string }) {
  const updateSettings = useUpdateSettings();
  const form = useForm<OrganizationNameInput>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: { name },
  });

  const onSubmit = async (values: OrganizationNameInput) => {
    try {
      await updateSettings.mutateAsync(values);
      form.reset(values);
      toast.success("Institución actualizada");
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="organization-name">Nombre de la institución</FieldLabel>
          <Input id="organization-name" {...form.register("name")} />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        disabled={updateSettings.isPending || !form.formState.isDirty}
        className="w-fit self-end"
      >
        {updateSettings.isPending ? <Spinner /> : null}
        Guardar
      </Button>
    </form>
  );
}
