"use client";

import type { ClaseDto } from "@repo/api/client";
import { useState } from "react";

import { ReportarIncidenciaDialog } from "@/components/incidencias/reportar-incidencia-dialog";
import { PublicarNovedadDialog } from "@/components/novedades/publicar-novedad-dialog";

import { AccionesClaseMenu } from "./acciones-clase-menu";
import { ClasesDelDia } from "./clases-del-dia";

// Panel del docente (CUR-05): sus clases de hoy con las acciones de cada una.
export function MisClasesDocente() {
  const [publicando, setPublicando] = useState<ClaseDto | null>(null);
  const [reportando, setReportando] = useState<ClaseDto | null>(null);

  return (
    <ClasesDelDia
      ambito="mias"
      emptyTitle="No tenés clases hoy"
      renderActions={(clase) => (
        <AccionesClaseMenu
          clase={clase}
          onReportarIncidencia={() => setReportando(clase)}
          onPublicarNovedad={() => setPublicando(clase)}
        />
      )}
    >
      {reportando?.aula ? (
        <ReportarIncidenciaDialog
          aula={reportando.aula}
          claseId={reportando.id}
          onClose={() => setReportando(null)}
        />
      ) : null}
      {publicando ? (
        <PublicarNovedadDialog
          open
          claseInicial={publicando}
          onOpenChange={(open) => !open && setPublicando(null)}
        />
      ) : null}
    </ClasesDelDia>
  );
}
