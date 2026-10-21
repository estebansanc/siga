"use client";

import { authClient, signInWithGoogle } from "@repo/auth/client";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { formValue } from "@/lib/form-data";

import { authRouteWithNext, nextRouteOf } from "./auth-routes";
import { GoogleIcon } from "./google-icon";

export function RegisterForm() {
  const router = useRouter();
  const next = nextRouteOf(useSearchParams());
  const [pending, setPending] = useState(false);
  const [redirectingToGoogle, setRedirectingToGoogle] = useState(false);
  const busy = pending || redirectingToGoogle;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: formValue(form, "name"),
      email: formValue(form, "email"),
      password: formValue(form, "password"),
    });
    if (error) {
      setPending(false);
      toast.error(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    router.push(next);
    router.refresh();
  };

  const continueWithGoogle = () => {
    setRedirectingToGoogle(true);
    void signInWithGoogle(next);
  };

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
              <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
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
