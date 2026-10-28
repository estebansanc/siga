"use client";

import { mensajeRecuperacionEnviada } from "@repo/domain";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useSolicitarRecuperacion } from "@/hooks/use-recuperar-contrasena";
import { formValue } from "@/lib/form-data";

// RF-12: la respuesta es la misma esté o no registrado el correo.
export function RecuperarContrasenaForm() {
  const solicitar = useSolicitarRecuperacion();
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const correo = formValue(new FormData(event.currentTarget), "email");
    setSent(false);
    solicitar.mutate({ correo }, { onSuccess: () => setSent(true) });
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Recuperá tu contraseña</CardTitle>
        <CardDescription>Te enviamos un enlace a tu correo para elegir una nueva</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {sent ? (
              <Alert>
                <AlertDescription>{mensajeRecuperacionEnviada}.</AlertDescription>
              </Alert>
            ) : null}
            {solicitar.error ? (
              <Alert variant="destructive">
                <AlertDescription>{solicitar.error.message}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <Button type="submit" disabled={solicitar.isPending}>
                {solicitar.isPending ? <Spinner /> : null}
                Enviar enlace
              </Button>
              <FieldDescription className="text-center">
                <Link href="/login">Volver a Ingresar</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
