"use client";

import type { PlanoPisoDto } from "@repo/api/client";
import { Button } from "@repo/ui/components/button";
import { DialogFooter } from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";

import type { AulaEditable } from "./aulas-editables";
import { LienzoPlano } from "./lienzo-plano";

type PasoVistaPreviaProps = {
  plano: PlanoPisoDto;
  aulas: AulaEditable[];
  nuevas: number;
  ubicadas: number;
  confirmando: boolean;
  onVolver: () => void;
  onConfirmar: () => void;
};

export function PasoVistaPrevia({
  plano,
  aulas,
  nuevas,
  ubicadas,
  confirmando,
  onVolver,
  onConfirmar,
}: PasoVistaPreviaProps) {
  return (
    <div className="flex flex-col gap-4">
      <LienzoPlano
        imagenUrl={plano.imagenUrl}
        ancho={plano.ancho}
        alto={plano.alto}
        aulas={aulas}
        mostrarNombres
      />
      <p className="text-sm font-medium">
        {nuevas} {nuevas === 1 ? "aula nueva" : "aulas nuevas"} · {ubicadas}{" "}
        {ubicadas === 1 ? "ubicada" : "ubicadas"}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={confirmando} onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" disabled={confirmando} onClick={onConfirmar}>
          {confirmando ? <Spinner /> : null}
          Confirmar
        </Button>
      </DialogFooter>
    </div>
  );
}
