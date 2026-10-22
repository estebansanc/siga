"use client";

import type { AulaDto } from "@repo/api/client";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAulasDisponibles } from "@/hooks/use-novedades";
import { RequestError } from "@/lib/api-client";
import { showRequestError } from "@/lib/form-errors";

const describirAula = (aula: AulaDto) =>
  `${aula.codigo} · ${aula.edificio}, ${aula.piso} · ${aula.capacidad} lugares`;

export type ElegirAulaProps = {
  claseId: string;
  titulo: string;
  descripcion: string;
  confirmLabel: string;
  exito: string;
  aulaPreelegidaId?: string;
  aulaActualId?: string;
  confirmar: (aulaId: string) => Promise<unknown>;
  onClose: () => void;
};

// Solo ofrece aulas Disponibles y libres en la franja de la clase, sin la que ya tiene. Si
// entre tanto otra operación ocupó el aula, el 409 se muestra acá y nada cambia.
export function ElegirAulaDialog({
  claseId,
  titulo,
  descripcion,
  confirmLabel,
  exito,
  aulaPreelegidaId,
  aulaActualId,
  confirmar,
  onClose,
}: ElegirAulaProps) {
  const disponibles = useAulasDisponibles([claseId]);
  const aulas = (disponibles.data ?? []).filter((aula) => aula.id !== aulaActualId);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aulaId = elegidaId ?? aulas.find((aula) => aula.id === aulaPreelegidaId)?.id ?? "";

  const enviar = async () => {
    setPending(true);
    setError(null);
    try {
      await confirmar(aulaId);
      toast.success(exito);
      onClose();
    } catch (cause) {
      if (cause instanceof RequestError && cause.status === 409) setError(cause.message);
      else showRequestError(cause);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {!disponibles.data ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Field>
            <FieldLabel htmlFor="elegir-aula">Aula</FieldLabel>
            <NativeSelect
              id="elegir-aula"
              className="w-full"
              value={aulaId}
              onChange={(event) => setElegidaId(event.target.value)}
            >
              <NativeSelectOption value="">
                {aulas.length === 0 ? "No hay aulas libres en esa franja" : "Elegí un aula"}
              </NativeSelectOption>
              {aulas.map((aula) => (
                <NativeSelectOption key={aula.id} value={aula.id}>
                  {describirAula(aula)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!aulaId || pending} onClick={() => void enviar()}>
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
