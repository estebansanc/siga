"use client";

import type { ClaseDto } from "@repo/api/client";
import { esEstadoClaseFinal } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { etiquetaEstadoClase } from "./estado-clase-badge";

const motivoSinIncidencia = (clase: ClaseDto) =>
  clase.aula ? null : "La clase no tiene aula asignada";

const motivoSinNovedad = (clase: ClaseDto) =>
  esEstadoClaseFinal(clase.estado) ? `La clase está ${etiquetaEstadoClase(clase)}` : null;

function AccionItem({
  label,
  motivo,
  onSelect,
}: {
  label: string;
  motivo: string | null;
  onSelect: () => void;
}): ReactNode {
  return (
    <DropdownMenuItem
      disabled={motivo !== null}
      onClick={onSelect}
      className="flex-col items-start"
    >
      <span>{label}</span>
      {motivo ? <span className="text-muted-foreground text-xs">{motivo}</span> : null}
    </DropdownMenuItem>
  );
}

// Menú ⋯ de la tarjeta de clase del docente; no propaga clics a la tarjeta (abre el detalle).
export function AccionesClaseMenu({
  clase,
  onReportarIncidencia,
  onPublicarNovedad,
}: {
  clase: ClaseDto;
  onReportarIncidencia: () => void;
  onPublicarNovedad: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Acciones de ${clase.materia.nombre} ${clase.comision.codigo}`}
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60"
        onClick={(event) => event.stopPropagation()}
      >
        <AccionItem
          label="Reportar incidencia"
          motivo={motivoSinIncidencia(clase)}
          onSelect={onReportarIncidencia}
        />
        <AccionItem
          label="Publicar novedad"
          motivo={motivoSinNovedad(clase)}
          onSelect={onPublicarNovedad}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
