"use client";

import type { SolicitudAulaDto } from "@repo/api/client";
import { motivoRechazoMax, rechazarSolicitudAulaSchema } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useRechazarSolicitudAula } from "@/hooks/use-solicitudes-aula";
import { showRequestError } from "@/lib/form-errors";

export function RechazarSolicitudDialog({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudAulaDto;
  onClose: () => void;
}) {
  const rechazar = useRechazarSolicitudAula();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    const valido = rechazarSolicitudAulaSchema.safeParse({ motivo });
    if (!valido.success) {
      setError(valido.error.issues[0]?.message ?? null);
      return;
    }
    try {
      await rechazar.mutateAsync({ id: solicitud.id, motivo: valido.data.motivo });
      toast.success("Solicitud rechazada");
      onClose();
    } catch (cause) {
      showRequestError(cause);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !rechazar.isPending && onClose()}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            {solicitud.clase.materia} · {solicitud.clase.comision}. La clase conserva su aula y el
            docente recibe el motivo por correo.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="rechazo-motivo">Motivo</FieldLabel>
          <Textarea
            id="rechazo-motivo"
            rows={3}
            maxLength={motivoRechazoMax}
            value={motivo}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setMotivo(event.target.value);
              setError(null);
            }}
          />
          <FieldDescription>
            {motivo.length} / {motivoRechazoMax}
          </FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={rechazar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={rechazar.isPending}
            onClick={() => void confirmar()}
          >
            {rechazar.isPending ? <Spinner /> : null}
            Rechazar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
