"use client";

import { authClient } from "@repo/auth/client";
import { contrasenaSchema, mensajeContrasena } from "@repo/domain";
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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { formValue } from "@/lib/form-data";

export function EnlaceInvalido() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">El enlace ya no sirve</CardTitle>
        <CardDescription>
          Venció o ya se usó. Pedile a Bedelía que te envíe uno nuevo.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Link href="/login" className="text-sm underline underline-offset-4">
          Ir a Ingresar
        </Link>
      </CardContent>
    </Card>
  );
}

// RF-10: la cuenta que dio de alta un administrador define su contraseña con el enlace del
// correo (24 horas, de un solo uso) y entra directo.
export function ActivarCuentaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [invalidLink, setInvalidLink] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = formValue(new FormData(event.currentTarget), "password");
    if (!contrasenaSchema.safeParse(password).success) {
      setError(mensajeContrasena);
      return;
    }
    setError(undefined);
    setPending(true);
    const reset = await authClient.resetPassword({ newPassword: password, token });
    if (reset.error) {
      setPending(false);
      if (reset.error.code === "INVALID_TOKEN") setInvalidLink(true);
      else setError(reset.error.message ?? mensajeContrasena);
      return;
    }
    const signIn = await authClient.signIn.email({ email, password });
    router.push(signIn.error ? "/login" : "/");
    router.refresh();
  };

  if (!token || invalidLink) return <EnlaceInvalido />;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Activá tu cuenta</CardTitle>
        <CardDescription>Definí la contraseña con la que vas a ingresar</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                required
              />
              <FieldDescription>{mensajeContrasena}.</FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Definir contraseña e ingresar
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
