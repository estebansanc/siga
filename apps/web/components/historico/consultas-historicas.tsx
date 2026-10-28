"use client";

import type { Perfil } from "@repo/domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import { HistoricoAsistencias } from "./historico-asistencias";
import { HistoricoNovedades } from "./historico-novedades";
import { HistoricoUsoAulas } from "./historico-uso-aulas";

// La Autoridad elige entre Asistencia docente, Uso de aulas y Novedades; el Bedel ve la
// asistencia y el uso de aulas como historial operativo (Novedades es de la Autoridad) y
// arranca en Uso de aulas.
export function ConsultasHistoricas({ perfil }: { perfil: Perfil }) {
  const esAutoridad = perfil === "AUTORIDAD";

  return (
    <Tabs defaultValue={esAutoridad ? "asistencia" : "uso-aulas"}>
      <TabsList aria-label="Tipo de consulta">
        <TabsTrigger value="asistencia">Asistencia docente</TabsTrigger>
        <TabsTrigger value="uso-aulas">Uso de aulas</TabsTrigger>
        {esAutoridad ? <TabsTrigger value="novedades">Novedades</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="asistencia">
        <HistoricoAsistencias />
      </TabsContent>
      <TabsContent value="uso-aulas">
        <HistoricoUsoAulas />
      </TabsContent>
      {esAutoridad ? (
        <TabsContent value="novedades">
          <HistoricoNovedades />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
