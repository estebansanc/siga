"use client";

import type { Perfil } from "@repo/domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import { HistoricoAsistencias } from "./historico-asistencias";
import { HistoricoUsoAulas } from "./historico-uso-aulas";

// Asistencia docente y Uso de aulas, los indicadores de rangos largos; las novedades e
// incidencias viven en sus secciones. La Autoridad arranca en Asistencia docente y el Bedel en
// Uso de aulas.
export function ConsultasHistoricas({ perfil }: { perfil: Perfil }) {
  return (
    <Tabs defaultValue={perfil === "AUTORIDAD" ? "asistencia" : "uso-aulas"}>
      <TabsList aria-label="Tipo de consulta">
        <TabsTrigger value="asistencia">Asistencia docente</TabsTrigger>
        <TabsTrigger value="uso-aulas">Uso de aulas</TabsTrigger>
      </TabsList>
      <TabsContent value="asistencia">
        <HistoricoAsistencias />
      </TabsContent>
      <TabsContent value="uso-aulas">
        <HistoricoUsoAulas />
      </TabsContent>
    </Tabs>
  );
}
