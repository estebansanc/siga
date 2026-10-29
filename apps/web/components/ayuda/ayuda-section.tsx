"use client";

import type { MemberRole, Perfil } from "@repo/domain";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import { ayudaPorPerfil, manualFor, type SeccionManual, type TareaGuia } from "@/lib/ayuda";

function GuiaRapida({ tareas }: { tareas: TareaGuia[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {tareas.map((tarea) => (
        <li key={tarea.titulo} className="min-w-0">
          <h2 className="break-words text-sm font-semibold">{tarea.titulo}</h2>
          <ol className="text-muted-foreground mt-1 list-decimal break-words pl-5 text-sm">
            {tarea.pasos.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function SeccionDelManual({ seccion }: { seccion: SeccionManual }) {
  return (
    <AccordionItem value={seccion.titulo}>
      <AccordionTrigger>{seccion.titulo}</AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-3 break-words text-sm">
          <p>{seccion.paraQueSirve}</p>
          <p>
            <span className="font-medium">Cómo se llega: </span>
            {seccion.comoSeLlega}
          </p>
          <div>
            <p className="font-medium">Pasos</p>
            <ol className="list-decimal pl-5">
              {seccion.pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="font-medium">Mensajes</p>
            <ul className="list-disc pl-5">
              {seccion.mensajes.map((mensaje) => (
                <li key={mensaje}>{mensaje}</li>
              ))}
            </ul>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function AyudaSection({ perfil, role }: { perfil: Perfil; role: MemberRole }) {
  return (
    <Tabs defaultValue="guia">
      <TabsList>
        <TabsTrigger value="guia">Guía rápida</TabsTrigger>
        <TabsTrigger value="manual">Manual de usuario</TabsTrigger>
      </TabsList>
      <TabsContent value="guia" className="pt-2">
        <GuiaRapida tareas={ayudaPorPerfil[perfil].guia} />
      </TabsContent>
      <TabsContent value="manual" className="pt-2">
        <Accordion>
          {manualFor(perfil, role).map((seccion) => (
            <SeccionDelManual key={seccion.titulo} seccion={seccion} />
          ))}
        </Accordion>
      </TabsContent>
    </Tabs>
  );
}
