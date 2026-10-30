"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { MeDto } from "@repo/api/client";
import {
  motivoBajaMaxLength,
  perfilLabels,
  updateProfileFormSchema,
  type UpdateProfileFormInput,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
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
  FieldTitle,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useMe, useSolicitarBaja, useUpdateProfile } from "@/hooks/use-me";
import { formatInstanteCorto } from "@/lib/dates";
import { showRequestError, showSaveError } from "@/lib/form-errors";

export function ProfileSection({ initialMe }: { initialMe: MeDto }) {
  const { data: me = initialMe } = useMe(initialMe);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Así te ven los demás usuarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm key={`${me.userName}|${me.dni}|${me.legajo}`} me={me} />
        </CardContent>
      </Card>
      <BajaCard bajaSolicitadaEn={me.bajaSolicitadaEn} />
    </div>
  );
}

function ProfileForm({ me }: { me: MeDto }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<UpdateProfileFormInput>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: { name: me.userName, dni: me.dni ?? "", legajo: me.legajo ?? "" },
  });
  const { errors } = form.formState;

  const onSubmit = async ({ name, dni, legajo }: UpdateProfileFormInput) => {
    if (me.dni && !dni) {
      form.setError("dni", { message: "Ingresá tu DNI" });
      return;
    }
    try {
      await updateProfile.mutateAsync({ name, dni: dni || undefined, legajo });
      form.reset({ name, dni, legajo });
      toast.success("Perfil actualizado");
    } catch (error) {
      showSaveError(error, form.setError, "dni");
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="profile-name">Apellido y nombre</FieldLabel>
          <Input id="profile-name" autoComplete="name" {...form.register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.dni)}>
          <FieldLabel htmlFor="profile-dni">DNI</FieldLabel>
          <Input id="profile-dni" inputMode="numeric" {...form.register("dni")} />
          <FieldError>{errors.dni?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.legajo)}>
          <FieldLabel htmlFor="profile-legajo">
            Legajo <span className="text-muted-foreground font-normal">(opcional)</span>
          </FieldLabel>
          <Input id="profile-legajo" {...form.register("legajo")} />
          <FieldError>{errors.legajo?.message}</FieldError>
        </Field>
        <Field>
          <FieldTitle>Correo</FieldTitle>
          <p className="text-sm" data-testid="profile-email">
            {me.userEmail}
          </p>
        </Field>
        <Field>
          <FieldTitle>Perfil</FieldTitle>
          <div>
            <Badge variant="secondary" data-testid="profile-perfil">
              {perfilLabels[me.perfil]}
            </Badge>
          </div>
          <FieldDescription>
            Para cambiar el correo o el perfil, pedíselo a Bedelía.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        disabled={updateProfile.isPending || !form.formState.isDirty}
        className="w-fit self-end"
      >
        {updateProfile.isPending ? <Spinner /> : null}
        Guardar
      </Button>
    </form>
  );
}

function BajaCard({ bajaSolicitadaEn }: { bajaSolicitadaEn: string | null }) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baja de la cuenta</CardTitle>
        <CardDescription>
          Bedelía o Autoridad resuelven el pedido. Hasta entonces seguís ingresando con normalidad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bajaSolicitadaEn ? (
          <p className="text-sm font-medium">
            Baja solicitada el {formatInstanteCorto(bajaSolicitadaEn)}
          </p>
        ) : (
          <Button variant="destructive" onClick={() => setConfirmando(true)}>
            Solicitar baja de mi cuenta
          </Button>
        )}
      </CardContent>
      {confirmando ? <SolicitarBajaDialog onClose={() => setConfirmando(false)} /> : null}
    </Card>
  );
}

function SolicitarBajaDialog({ onClose }: { onClose: () => void }) {
  const solicitarBaja = useSolicitarBaja();
  const [motivo, setMotivo] = useState("");

  const confirmar = async () => {
    try {
      await solicitarBaja.mutateAsync({ motivo });
      toast.success("Registramos tu pedido de baja");
      onClose();
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="¿Solicitar la baja de tu cuenta?"
      description="Bedelía o Autoridad van a revisar el pedido. Tu cuenta sigue activa hasta que lo resuelvan y tu historial se conserva."
      confirmLabel="Solicitar baja"
      pending={solicitarBaja.isPending}
      onConfirm={() => void confirmar()}
    >
      <Field>
        <FieldLabel htmlFor="baja-motivo">Motivo (opcional)</FieldLabel>
        <Textarea
          id="baja-motivo"
          maxLength={motivoBajaMaxLength}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
        />
        <FieldDescription>
          {motivo.length}/{motivoBajaMaxLength}
        </FieldDescription>
      </Field>
    </ConfirmDialog>
  );
}
