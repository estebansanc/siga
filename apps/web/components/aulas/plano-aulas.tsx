"use client";

import type { PlanoAulaDto } from "@repo/api/client";
import { compararPisos } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { cn } from "@repo/ui/lib/utils";
import { DoorOpenIcon } from "lucide-react";
import { useState } from "react";

import { tonoClassNames } from "@/components/estado-tonos";
import { usePlanoAulas } from "@/hooks/use-aulas";

import { PlanoAulaDialog } from "./plano-aula-dialog";
import { PlanoEstadoBadge, planoEstadoPresentacion } from "./plano-estado-badge";

const primeraSeleccion = (aulas: PlanoAulaDto[]) => {
  const edificio = aulas.map((aula) => aula.edificio).sort((a, b) => a.localeCompare(b, "es"))[0];
  const piso = aulas
    .filter((aula) => aula.edificio === edificio)
    .map((aula) => aula.piso)
    .sort(compararPisos)[0];
  return edificio && piso ? { edificio, piso } : undefined;
};

const unicos = (valores: string[]) => [...new Set(valores)];

function Selector({
  etiqueta,
  opciones,
  valor,
  onChange,
}: {
  etiqueta: string;
  opciones: string[];
  valor: string | undefined;
  onChange: (valor: string) => void;
}) {
  return (
    <ToggleGroup
      variant="outline"
      className="flex-wrap"
      value={valor ? [valor] : []}
      onValueChange={(elegidos: string[]) => {
        const elegido = elegidos.at(-1);
        if (elegido) onChange(elegido);
      }}
      aria-label={etiqueta}
    >
      {opciones.map((opcion) => (
        <ToggleGroupItem key={opcion} value={opcion}>
          {opcion}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function AulaCelda({ aula, onClick }: { aula: PlanoAulaDto; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-auto min-w-0 flex-col items-start gap-2 p-3",
        tonoClassNames[planoEstadoPresentacion[aula.estado].tono],
      )}
      onClick={onClick}
    >
      <span className="max-w-full truncate font-semibold">{aula.codigo}</span>
      <PlanoEstadoBadge estado={aula.estado} className="max-w-full" />
    </Button>
  );
}

// Plano de aulas (RF-02, RF-07): grilla provisoria por código hasta tener los planos de cada
// piso. Se actualiza por consulta periódica de 30 s. La elección inicial queda fijada con los
// primeros datos: si el piso se vacía no salta a otro.
export function PlanoAulas() {
  const plano = usePlanoAulas();
  const [seleccion, setSeleccion] = useState<{ edificio: string; piso: string }>();
  const [aulaId, setAulaId] = useState<string | null>(null);

  const aulas = plano.data;
  const primera = aulas ? primeraSeleccion(aulas) : undefined;
  if (!seleccion && primera) setSeleccion(primera);

  const edificios = aulas
    ? unicos([
        ...aulas.map((aula) => aula.edificio),
        ...(seleccion ? [seleccion.edificio] : []),
      ]).sort((a, b) => a.localeCompare(b, "es"))
    : [];
  const edificio = seleccion?.edificio;
  const deEdificio = aulas?.filter((aula) => aula.edificio === edificio) ?? [];
  const pisos = unicos([
    ...deEdificio.map((aula) => aula.piso),
    ...(seleccion ? [seleccion.piso] : []),
  ]).sort(compararPisos);
  const piso = seleccion?.piso;
  const delPiso = deEdificio.filter((aula) => aula.piso === piso);
  const aulaAbierta = aulas?.find((aula) => aula.id === aulaId);

  const elegirEdificio = (valor: string) => {
    const pisoMasBajo = aulas
      ?.filter((aula) => aula.edificio === valor)
      .map((aula) => aula.piso)
      .sort(compararPisos)[0];
    if (pisoMasBajo) setSeleccion({ edificio: valor, piso: pisoMasBajo });
  };
  const elegirPiso = (valor: string) => seleccion && setSeleccion({ ...seleccion, piso: valor });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano de aulas</CardTitle>
        <CardDescription>
          Estado de cada aula en tiempo real. Tocá un aula para ver el detalle.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!aulas ? (
          <Skeleton className="h-40 w-full" />
        ) : edificios.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DoorOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Sin aulas activas</EmptyTitle>
              <EmptyDescription>Las aulas que se carguen aparecen acá.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Selector
              etiqueta="Edificio"
              opciones={edificios}
              valor={edificio}
              onChange={elegirEdificio}
            />
            <Selector etiqueta="Piso" opciones={pisos} valor={piso} onChange={elegirPiso} />
            {delPiso.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <DoorOpenIcon />
                  </EmptyMedia>
                  <EmptyTitle>No hay aulas activas en este piso</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {delPiso.map((aula) => (
                  <AulaCelda key={aula.id} aula={aula} onClick={() => setAulaId(aula.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
      {aulaAbierta ? <PlanoAulaDialog aula={aulaAbierta} onClose={() => setAulaId(null)} /> : null}
    </Card>
  );
}
