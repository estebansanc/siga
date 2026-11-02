"use client";

import { buttonVariants } from "@repo/ui/components/button";
import Link from "next/link";

import { useClases } from "@/hooks/use-clases";
import { usePreferencias } from "@/hooks/use-preferencias";
import { capitalizarPrimera, formatFechaLarga } from "@/lib/dates";

import { ClasesEmpty, ClasesList, ClasesSkeleton } from "./clases-list";

// Panel principal del estudiante (CUR-02): sus comisiones seguidas, hoy, en dos interacciones
// desde el inicio de sesión (US-1).
export function MisClasesHoy() {
  const preferencias = usePreferencias();
  const clases = useClases({ ambito: "mias" });
  const sigueComisiones = (preferencias.data?.comisiones.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">
          {clases.data ? capitalizarPrimera(formatFechaLarga(clases.data.fecha)) : "Hoy"}
        </h2>
        {clases.data && sigueComisiones ? (
          <span className="text-muted-foreground text-sm">
            {clases.data.clases.length} {clases.data.clases.length === 1 ? "clase" : "clases"} ·{" "}
            {preferencias.data?.comisiones
              .map((comision) => comision.codigo)
              .filter((codigo, index, all) => all.indexOf(codigo) === index)
              .join(", ")}
          </span>
        ) : null}
      </div>
      {!preferencias.data ? (
        <ClasesSkeleton />
      ) : !sigueComisiones ? (
        <ClasesEmpty
          title="Todavía no seguís ninguna comisión"
          description="Elegí las comisiones que cursás para ver el estado de tus clases de hoy."
        >
          <Link href="/mi-cuenta/comisiones" className={buttonVariants()}>
            Elegir comisiones
          </Link>
        </ClasesEmpty>
      ) : (
        <ClasesList
          clases={clases.data?.clases}
          emptyState={<ClasesEmpty title="No tenés clases hoy" />}
        />
      )}
    </div>
  );
}
