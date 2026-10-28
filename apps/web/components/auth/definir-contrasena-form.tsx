"use client";

import { authClient } from "@repo/auth/client";
import { definirContrasenaSchema, mensajeEnlaceVencido, politicaContrasena } from "@repo/domain";
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
import { Spinner } from "@repo/ui/components/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useDefinirContrasena, useEnlaceVigente } from "@/hooks/use-recuperar-contrasena";
import { RequestError } from "@/lib/api-client";
import { formValue } from "@/lib/form-data";

type FieldErrors = { contrasena?: string; confirmacion?: string };

function EnlaceVencido() {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Definir contraseña</CardTitle>
        <CardDescription role="alert">{mensajeEnlaceVencido}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={() => router.push("/recuperar-contrasena")}>Pedir otro enlace</Button>
      </CardContent>
    </Card>
  );
}

// RF-12: el enlace del correo (60 minutos, de un solo uso) permite elegir una contraseña nueva.
export function DefinirContrasenaForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const definir = useDefinirContrasena();
  const enlace = useEnlaceVigente(token);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [invalidLink, setInvalidLink] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = definirContrasenaSchema.safeParse({
      token,
      contrasena: formValue(form, "contrasena"),
      confirmacion: formValue(form, "confirmacion"),
    });
    if (!parsed.success) {
      const [issue] = parsed.error.issues;
      setErrors(
        issue?.path[0] === "confirmacion"
          ? { confirmacion: issue.message }
          : { contrasena: issue?.message },
      );
      return;
    }
    setErrors({});
    definir.mutate(parsed.data, {
      onSuccess: () => {
        // Las sesiones de la cuenta ya se cerraron en la API; sin limpiar la cookie de este
        // dispositivo el proxy mandaría /login al inicio.
        void authClient
          .signOut()
          .catch(() => undefined)
          .then(() => router.push("/login?contrasena=actualizada"));
      },
      onError: (error) => {
        if (error instanceof RequestError && error.status === 400) setInvalidLink(true);
        else setErrors({ contrasena: error.message });
      },
    });
  };

  if (!token || invalidLink || enlace.isError) return <EnlaceVencido />;
  if (enlace.isPending) return null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Definir contraseña</CardTitle>
        <CardDescription>Elegí la contraseña con la que vas a ingresar</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.contrasena)}>
              <FieldLabel htmlFor="contrasena">Nueva contraseña</FieldLabel>
              <Input
                id="contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.contrasena)}
                required
              />
              <FieldDescription>{politicaContrasena}</FieldDescription>
              <FieldError>{errors.contrasena}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.confirmacion)}>
              <FieldLabel htmlFor="confirmacion">Confirmar contraseña</FieldLabel>
              <Input
                id="confirmacion"
                name="confirmacion"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmacion)}
                required
              />
              <FieldError>{errors.confirmacion}</FieldError>
            </Field>
            <Field>
              <Button type="submit" disabled={definir.isPending}>
                {definir.isPending ? <Spinner /> : null}
                Definir contraseña
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
