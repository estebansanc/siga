"use client";

import type { Perfil } from "@repo/domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import { HistoricoAsistencias } from "./historico-asistencias";
import { HistoricoNovedades } from "./historico-novedades";

// La Autoridad elige entre Asistencia docente y Novedades; el Bedel solo ve la asistencia
// como historial operativo (la matriz le da consultas operativas, Novedades es de la Autoridad).
export function ConsultasHistoricas({ perfil }: { perfil: Perfil }) {
  if (perfil !== "AUTORIDAD") return <HistoricoAsistencias />;

  return (
    <Tabs defaultValue="asistencia">
      <TabsList aria-label="Tipo de consulta">
        <TabsTrigger value="asistencia">Asistencia docente</TabsTrigger>
        <TabsTrigger value="novedades">Novedades</TabsTrigger>
      </TabsList>
      <TabsContent value="asistencia">
        <HistoricoAsistencias />
      </TabsContent>
      <TabsContent value="novedades">
        <HistoricoNovedades />
      </TabsContent>
    </Tabs>
  );
}
