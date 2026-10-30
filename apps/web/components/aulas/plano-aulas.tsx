"use client";

import type { PlanoAulaDto } from "@repo/api/client";
import {
  compararPisos,
  contarEstadosDelPiso,
  describirConteoPiso,
  type Perfil,
} from "@repo/domain";
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

const porNombre = (a: string, b: string) => a.localeCompare(b, "es");

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

function PisoSeccion({
  piso,
  aulas,
  onAbrirAula,
}: {
  piso: string;
  aulas: PlanoAulaDto[];
  onAbrirAula: (aulaId: string) => void;
}) {
  const conteo = describirConteoPiso(contarEstadosDelPiso(aulas.map((aula) => aula.estado)));
  return (
    <section aria-label={piso} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-heading text-base font-semibold">{piso}</h3>
        <p className="text-muted-foreground text-sm">{conteo}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {aulas.map((aula) => (
          <AulaCelda key={aula.id} aula={aula} onClick={() => onAbrirAula(aula.id)} />
        ))}
      </div>
    </section>
  );
}

// Plano de aulas (RF-02, RF-07): todos los pisos del edificio apilados, cada uno con su conteo
// y una grilla provisoria por código hasta tener los planos de cada piso. Se actualiza por
// consulta periódica de 30 s. El edificio inicial queda fijado con los primeros datos: si se
// queda sin aulas no salta a otro.
export function PlanoAulas({
  perfil,
  onAbrirAula,
}: {
  perfil: Perfil;
  onAbrirAula?: (aulaId: string) => void;
}) {
  const plano = usePlanoAulas();
  const [edificioElegido, setEdificioElegido] = useState<string>();
  const [aulaId, setAulaId] = useState<string | null>(null);

  const aulas = plano.data;
  const edificiosConAulas = aulas ? unicos(aulas.map((aula) => aula.edificio)).sort(porNombre) : [];
  const primero = edificiosConAulas[0];
  if (!edificioElegido && primero) setEdificioElegido(primero);

  const edificios = edificioElegido
    ? unicos([...edificiosConAulas, edificioElegido]).sort(porNombre)
    : edificiosConAulas;
  const deEdificio = aulas?.filter((aula) => aula.edificio === edificioElegido) ?? [];
  const pisos = unicos(deEdificio.map((aula) => aula.piso)).sort(compararPisos);
  const aulaAbierta = onAbrirAula ? undefined : aulas?.find((aula) => aula.id === aulaId);
  const abrirAula = onAbrirAula ?? setAulaId;

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
            {edificios.length > 1 ? (
              <Selector
                etiqueta="Edificio"
                opciones={edificios}
                valor={edificioElegido}
                onChange={setEdificioElegido}
              />
            ) : null}
            {pisos.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <DoorOpenIcon />
                  </EmptyMedia>
                  <EmptyTitle>No hay aulas activas en este edificio</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              pisos.map((piso) => (
                <PisoSeccion
                  key={piso}
                  piso={piso}
                  aulas={deEdificio.filter((aula) => aula.piso === piso)}
                  onAbrirAula={abrirAula}
                />
              ))
            )}
          </>
        )}
      </CardContent>
      {aulaAbierta ? (
        <PlanoAulaDialog aula={aulaAbierta} perfil={perfil} onClose={() => setAulaId(null)} />
      ) : null}
    </Card>
  );
}
