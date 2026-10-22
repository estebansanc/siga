"use client";

import type { AulaGestionDto } from "@repo/api/client";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { useAula, useDarDeBajaAula } from "@/hooks/use-aulas";
import { showRequestError } from "@/lib/form-errors";

import { AulaClasesList } from "./aula-clases-list";

export function BajaAulaDialog({ aula, onClose }: { aula: AulaGestionDto; onClose: () => void }) {
  const detalle = useAula(aula.id);
  const darDeBaja = useDarDeBajaAula();
  const afectadas = detalle.data?.clasesAfectadas ?? [];

  const confirmar = async () => {
    try {
      await darDeBaja.mutateAsync(aula.id);
      toast.success(`${aula.codigo} dada de baja`);
      onClose();
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`¿Dar de baja ${aula.codigo}?`}
      description="Deja de ofrecerse para asignar clases. El código queda reservado y se puede reactivar desde las dadas de baja."
      confirmLabel="Dar de baja"
      pending={darDeBaja.isPending}
      confirmDisabled={!detalle.data}
      onConfirm={() => void confirmar()}
    >
      {!detalle.data ? (
        <Skeleton className="h-16 w-full" />
      ) : afectadas.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {afectadas.length} {afectadas.length === 1 ? "clase asignada" : "clases asignadas"} sin
            terminar (conservan el aula hasta que las reasignes):
          </p>
          <AulaClasesList clases={afectadas} vacio="" />
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
