"use client";

import { authClient, signInWithGoogle } from "@repo/auth/client";
import { mensajeContrasena } from "@repo/domain";
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
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { formValue } from "@/lib/form-data";

import { authRouteWithNext, nextRouteOf } from "./auth-routes";
import { GoogleIcon } from "./google-icon";

export function RegisterForm() {
  const next = nextRouteOf(useSearchParams());
  const [pending, setPending] = useState(false);
  const [redirectingToGoogle, setRedirectingToGoogle] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>();
  const busy = pending || redirectingToGoogle;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const email = formValue(form, "email");
    const { error } = await authClient.signUp.email({
      name: formValue(form, "name"),
      email,
      password: formValue(form, "password"),
      callbackURL: next,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    setRegisteredEmail(email);
  };

  const continueWithGoogle = () => {
    setRedirectingToGoogle(true);
    void signInWithGoogle(next);
  };

  if (registeredEmail) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Revisá tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace a {registeredEmail}. Verificalo en las próximas 24 horas para
            poder ingresar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href={authRouteWithNext("/login", next)} className="text-sm underline">
            Ir a Ingresar
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate como estudiante de la UTN FRT</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <Button variant="outline" type="button" disabled={busy} onClick={continueWithGoogle}>
                {redirectingToGoogle ? <Spinner /> : <GoogleIcon />}
                Continuar con Google
              </Button>
            </Field>
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              O con tu email
            </FieldSeparator>
            <Field>
              <FieldLabel htmlFor="name">Nombre y apellido</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldDescription>{mensajeContrasena}.</FieldDescription>
            </Field>
            <Field>
              <Button type="submit" disabled={busy}>
                {pending ? <Spinner /> : null}
                Crear cuenta
              </Button>
              <FieldDescription className="text-center">
                ¿Ya tenés cuenta? <Link href={authRouteWithNext("/login", next)}>Ingresá</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
