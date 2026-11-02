"use client";

import type { ClaseDto } from "@repo/api/client";
import type { AmbitoClases } from "@repo/domain";
import type { ReactNode } from "react";

import { useClases } from "@/hooks/use-clases";
import { formatFechaLarga } from "@/lib/dates";

import { ClasesEmpty, ClasesList } from "./clases-list";

// Clases de hoy del docente (ámbito "mias").
export function ClasesDelDia({
  ambito,
  emptyTitle,
  renderActions,
  children,
}: {
  ambito: AmbitoClases;
  emptyTitle: string;
  renderActions?: (clase: ClaseDto) => ReactNode;
  children?: ReactNode;
}) {
  const clases = useClases({ ambito });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">
          {clases.data ? `Hoy · ${formatFechaLarga(clases.data.fecha)}` : "Hoy"}
        </h2>
        {clases.data ? (
          <span className="text-muted-foreground text-sm">
            {clases.data.clases.length} {clases.data.clases.length === 1 ? "clase" : "clases"}
          </span>
        ) : null}
      </div>
      <ClasesList
        clases={clases.data?.clases}
        emptyState={<ClasesEmpty title={emptyTitle} />}
        renderActions={renderActions}
      />
      {children}
    </div>
  );
}
