"use client";

import type { GeneracionClasesDto } from "@repo/api/client";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { useState } from "react";

import { useGenerarClases, type GenerarClases } from "@/hooks/use-datos-academicos";
import { showRequestError } from "@/lib/form-errors";

// RF-13: crea las clases Programadas desde hoy hasta el fin del período y muestra el resumen.
export function GenerarClasesDialog({
  nombre,
  alcance,
  onClose,
}: {
  nombre: string;
  alcance: GenerarClases;
  onClose: () => void;
}) {
  const generar = useGenerarClases();
  const [resumen, setResumen] = useState<GeneracionClasesDto | null>(null);

  const confirmar = async () => {
    try {
      setResumen(await generar.mutateAsync(alcance));
    } catch (error) {
      showRequestError(error);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !generar.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar clases de {nombre}</DialogTitle>
          <DialogDescription>
            Crea las clases Programadas desde hoy hasta el fin del período, sin los días no
            laborables. Las que ya existen se conservan.
          </DialogDescription>
        </DialogHeader>
        {resumen ? (
          <dl className="grid grid-cols-3 gap-2 text-center" aria-label="Resumen de la generación">
            <div>
              <dt className="text-muted-foreground text-sm">Creadas</dt>
              <dd className="text-2xl font-semibold">{resumen.creadas}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Existentes</dt>
              <dd className="text-2xl font-semibold">{resumen.existentes}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Sin aula</dt>
              <dd className="text-2xl font-semibold">{resumen.sinAula}</dd>
            </div>
          </dl>
        ) : null}
        <DialogFooter>
          {resumen ? (
            <Button onClick={onClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" disabled={generar.isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={generar.isPending} onClick={() => void confirmar()}>
                {generar.isPending ? <Spinner /> : null}
                Generar clases
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
