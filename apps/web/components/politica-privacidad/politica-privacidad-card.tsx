"use client";

import type { PoliticaPrivacidadDto } from "@repo/api/client";
import { authClient } from "@repo/auth/client";
import { fechaArgentina, mensajeVersionDesactualizada, parrafosDeLaPolitica } from "@repo/domain";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  politicaVigenteQuery,
  useAceptarPolitica,
  usePoliticaPrivacidad,
} from "@/hooks/use-politica-privacidad";
import { RequestError } from "@/lib/api-client";
import { formatFechaCorta } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";

type Props = {
  initialPolitica: PoliticaPrivacidadDto;
  // Sin aceptar la vigente es la única pantalla disponible: ofrece aceptar o cerrar sesión.
  pendiente: boolean;
  destino: Route;
};

export function PoliticaPrivacidadCard({ initialPolitica, pendiente, destino }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: politica } = usePoliticaPrivacidad(initialPolitica);
  const aceptar = useAceptarPolitica();
  const [aviso, setAviso] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const onAceptar = async () => {
    setAviso(null);
    try {
      await aceptar.mutateAsync(politica.version);
      router.push(destino);
      router.refresh();
    } catch (error) {
      if (!(error instanceof RequestError) || error.status !== 409) throw error;
      queryClient.setQueryData(queryKeys.politicaPrivacidad, await politicaVigenteQuery());
      setAviso(mensajeVersionDesactualizada);
    }
  };

  const onCerrarSesion = async () => {
    setSigningOut(true);
    await authClient.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  const Heading = pendiente ? "h1" : "h2";

  return (
    <Card className={cn("min-h-0", pendiente ? "flex-1" : "max-h-full")}>
      <CardHeader>
        <CardTitle>
          <Heading>{politica.titulo}</Heading>
        </CardTitle>
        <CardDescription>Versión {politica.version}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {aviso ? (
          <Alert>
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        ) : null}
        <ScrollArea className="min-h-0 flex-1" data-testid="politica-texto">
          <div className="flex flex-col gap-3 pr-3 text-sm">
            {parrafosDeLaPolitica(politica.texto).map((parrafo) => (
              <p key={parrafo}>{parrafo}</p>
            ))}
          </div>
        </ScrollArea>
        {!pendiente && politica.aceptadaEn ? (
          <p className="text-muted-foreground text-sm">
            Aceptaste esta versión el{" "}
            {formatFechaCorta(fechaArgentina(new Date(politica.aceptadaEn)))}
          </p>
        ) : null}
      </CardContent>
      {pendiente ? (
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={signingOut || aceptar.isPending}
            onClick={onCerrarSesion}
          >
            {signingOut ? <Spinner /> : null}
            Cerrar sesión
          </Button>
          <Button disabled={signingOut || aceptar.isPending} onClick={onAceptar}>
            {aceptar.isPending ? <Spinner /> : null}
            Aceptar y continuar
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
