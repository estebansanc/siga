"use client";

import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { RequestError } from "@/lib/api-client";
import { showRequestError } from "@/lib/form-errors";

export type PlanoAccionDialogProps = {
  titulo: string;
  descripcion: string;
  confirmLabel: string;
  exito: string;
  cargando: boolean;
  puedeConfirmar: boolean;
  confirmar: () => Promise<unknown>;
  onClose: () => void;
  children: ReactNode;
};

// Si entre tanto otra operación ocupó el aula, el 409 (con la comisión que la ocupa) se
// muestra acá y nada cambia.
export function PlanoAccionDialog({
  titulo,
  descripcion,
  confirmLabel,
  exito,
  cargando,
  puedeConfirmar,
  confirmar,
  onClose,
  children,
}: PlanoAccionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    setPending(true);
    setError(null);
    try {
      await confirmar();
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
        {cargando ? <Skeleton className="h-9 w-full" /> : children}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!puedeConfirmar || pending} onClick={() => void enviar()}>
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
