"use client";

import { Skeleton } from "@repo/ui/components/skeleton";
import { toast } from "sonner";

import { AulaClasesList } from "@/components/aulas/aula-clases-list";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useActualizarAula, useAula } from "@/hooks/use-aulas";
import { showRequestError } from "@/lib/form-errors";

import type { AulaDeIncidencia } from "./reportar-incidencia-dialog";

// La incidencia que impide el uso del aula propone al Bedel el flujo de RF-02: pasarla a
// Fuera de servicio viendo las clases que quedan afectadas.
export function ProponerFueraDeServicioDialog({
  aula,
  onClose,
}: {
  aula: AulaDeIncidencia;
  onClose: () => void;
}) {
  const detalle = useAula(aula.id);
  const actualizar = useActualizarAula(aula.id);
  const afectadas = detalle.data?.clasesAfectadas ?? [];

  const confirmar = async () => {
    try {
      await actualizar.mutateAsync({ estado: "FUERA_DE_SERVICIO" });
      toast.success(`${aula.codigo} pasó a Fuera de servicio`);
      onClose();
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`¿Pasar ${aula.codigo} a Fuera de servicio?`}
      description="La incidencia impide el uso del aula. Las clases asignadas conservan el aula hasta que las reasignes y dejará de ofrecerse en Cambio de aula."
      confirmLabel="Pasar a Fuera de servicio"
      pending={actualizar.isPending}
      confirmDisabled={!detalle.data}
      onConfirm={() => void confirmar()}
    >
      {!detalle.data ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {afectadas.length === 0
              ? "No hay clases afectadas."
              : `${afectadas.length} ${afectadas.length === 1 ? "clase afectada" : "clases afectadas"}:`}
          </p>
          <AulaClasesList clases={afectadas} vacio="" />
        </div>
      )}
    </ConfirmDialog>
  );
}
