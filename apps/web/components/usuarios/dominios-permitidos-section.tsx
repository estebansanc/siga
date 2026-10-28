"use client";

import { dominiosPermitidosSchema } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useActualizarDominios, useDominiosPermitidos } from "@/hooks/use-usuarios";
import { showRequestError } from "@/lib/form-errors";

const lineas = (texto: string) =>
  texto
    .split(/[\n,]/)
    .map((linea) => linea.trim())
    .filter(Boolean);

function DominiosForm({ dominios }: { dominios: string[] }) {
  const actualizar = useActualizarDominios();
  const [texto, setTexto] = useState(dominios.join("\n"));
  const [error, setError] = useState<string>();

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    const resultado = dominiosPermitidosSchema.safeParse({ dominios: lineas(texto) });
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    try {
      const guardados = await actualizar.mutateAsync(resultado.data);
      setTexto(guardados.dominios.join("\n"));
      toast.success(
        guardados.dominios.length > 0 ? "Dominios guardados" : "Se acepta cualquier dominio",
      );
    } catch (fallo) {
      showRequestError(fallo);
    }
  };

  return (
    <form noValidate onSubmit={guardar}>
      <CardContent>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="dominios-permitidos">Dominios</FieldLabel>
          <Textarea
            id="dominios-permitidos"
            rows={3}
            value={texto}
            placeholder="frt.utn.edu.ar"
            onChange={(event) => setTexto(event.target.value)}
          />
          <FieldDescription>Uno por línea. Vacío acepta cualquier dominio.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
      </CardContent>
      <CardFooter className="pt-4">
        <Button type="submit" size="sm" disabled={actualizar.isPending}>
          {actualizar.isPending ? <Spinner /> : null}
          Guardar dominios
        </Button>
      </CardFooter>
    </form>
  );
}

// CFG-1: el autorregistro y Google solo aceptan correos de estos dominios; las altas de
// Bedel y Autoridad no dependen de ellos.
export function DominiosPermitidosSection() {
  const dominios = useDominiosPermitidos();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dominios permitidos</CardTitle>
        <CardDescription>
          Con dominios cargados, solo se pueden registrar personas con un correo de alguno de ellos.
        </CardDescription>
      </CardHeader>
      {dominios.data ? (
        <DominiosForm dominios={dominios.data.dominios} />
      ) : (
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      )}
    </Card>
  );
}
