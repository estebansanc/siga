"use client";

import type { BajaCorreoResultadoDto } from "@repo/api/client";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { useState } from "react";

import { useBajaCorreo } from "@/hooks/use-baja-correo";
import { RequestError } from "@/lib/api-client";

const enlaceInvalido = "El enlace para dejar de recibir correos no es válido.";

const mensajeDeBaja = {
  novedades:
    "Listo. Ya no vas a recibir novedades de clase por correo. Podés volver a activarlas desde Preferencias.",
  avisos: "Listo, ya no vas a recibir avisos institucionales por correo.",
} as const;

const pedidoDeBaja = (token: string) =>
  token.startsWith("avisos.")
    ? "Dejás de recibir los avisos institucionales por correo."
    : "Dejás de recibir los correos de novedades de clase.";

const errorMessage = (error: unknown) =>
  error instanceof RequestError && error.status === 400
    ? enlaceInvalido
    : "No pudimos procesar la baja. Probá de nuevo en un momento.";

// La baja exige apretar el botón: los escáneres de correo abren los enlaces y no deben darla.
export function BajaCorreoCard({ token }: { token: string }) {
  const baja = useBajaCorreo();
  const [resultado, setResultado] = useState<
    BajaCorreoResultadoDto["tipo"] | { error: string } | null
  >(null);

  const darDeBaja = async () => {
    try {
      const { tipo } = await baja.mutateAsync(token);
      setResultado(tipo);
    } catch (error) {
      setResultado({ error: errorMessage(error) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dejar de recibir correos</CardTitle>
        <CardDescription>
          {typeof resultado === "string"
            ? mensajeDeBaja[resultado]
            : token
              ? pedidoDeBaja(token)
              : enlaceInvalido}
        </CardDescription>
      </CardHeader>
      {typeof resultado === "object" && resultado !== null ? (
        <CardContent>
          <p role="alert" className="text-destructive text-sm">
            {resultado.error}
          </p>
        </CardContent>
      ) : null}
      {typeof resultado !== "string" && token ? (
        <CardFooter>
          <Button disabled={baja.isPending} onClick={() => void darDeBaja()}>
            {baja.isPending ? <Spinner /> : null}
            Dejar de recibir
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
