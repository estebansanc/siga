"use client";

import type { AvisoDto } from "@repo/api/client";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useFinalizarAviso } from "@/hooks/use-avisos";
import { showRequestError } from "@/lib/form-errors";

export function FinalizarAvisoDialog({ aviso, onClose }: { aviso: AvisoDto; onClose: () => void }) {
  const finalizar = useFinalizarAviso();

  const confirmar = async () => {
    try {
      await finalizar.mutateAsync(aviso.id);
      toast.success("Aviso finalizado");
      onClose();
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="¿Finalizar el aviso?"
      description={`"${aviso.titulo}" deja de mostrarse como vigente para todos y pasa al historial. No se envían correos y no se puede deshacer.`}
      confirmLabel="Finalizar aviso"
      pending={finalizar.isPending}
      onConfirm={() => void confirmar()}
    />
  );
}
