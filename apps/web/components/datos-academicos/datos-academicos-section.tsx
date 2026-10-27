"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import { CarrerasTab } from "./carreras-tab";
import { ComisionesTab } from "./comisiones-tab";
import { DiasNoLaborablesTab } from "./dias-no-laborables-tab";
import { HorariosTab } from "./horarios-tab";
import { MateriasTab } from "./materias-tab";
import { PeriodosTab } from "./periodos-tab";

const pestanias = [
  { valor: "carreras", etiqueta: "Carreras", contenido: <CarrerasTab /> },
  { valor: "materias", etiqueta: "Materias", contenido: <MateriasTab /> },
  { valor: "periodos", etiqueta: "Períodos", contenido: <PeriodosTab /> },
  { valor: "comisiones", etiqueta: "Comisiones", contenido: <ComisionesTab /> },
  { valor: "horarios", etiqueta: "Horarios", contenido: <HorariosTab /> },
  { valor: "dias", etiqueta: "Días no laborables", contenido: <DiasNoLaborablesTab /> },
];

// RF-13: una pestaña por entidad; cada una se administra por separado.
export function DatosAcademicosSection() {
  return (
    <Tabs defaultValue="carreras" className="min-w-0">
      <div className="overflow-x-auto">
        <TabsList>
          {pestanias.map((pestania) => (
            <TabsTrigger key={pestania.valor} value={pestania.valor}>
              {pestania.etiqueta}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {pestanias.map((pestania) => (
        <TabsContent key={pestania.valor} value={pestania.valor}>
          {pestania.contenido}
        </TabsContent>
      ))}
    </Tabs>
  );
}
