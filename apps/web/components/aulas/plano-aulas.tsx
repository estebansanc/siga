"use client";

import type { PlanoAulaDto, PlanoImagenDto } from "@repo/api/client";
import {
  compararPisos,
  contarEstadosDelPiso,
  describirConteoPiso,
  repartirAulasDelPiso,
  zoomMinimo,
  type Perfil,
} from "@repo/domain";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
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
import { DoorOpenIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { tonoClassNames } from "@/components/estado-tonos";
import { usePlanoAulas } from "@/hooks/use-aulas";

import { PlanoAulaDialog } from "./plano-aula-dialog";
import { PlanoEstadoBadge, planoEstadoPresentacion } from "./plano-estado-badge";
import { PlanoPiso, type AulaUbicada } from "./plano-piso";

const porNombre = (a: string, b: string) => a.localeCompare(b, "es");

// La firma cambia en cada respuesta; la ruta cambia solo cuando se reemplaza la imagen del piso.
const rutaDeLaImagen = (imagenUrl: string) => imagenUrl.split("?")[0];

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

function GrillaAulas({
  aulas,
  onAbrirAula,
}: {
  aulas: PlanoAulaDto[];
  onAbrirAula: (aulaId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {aulas.map((aula) => (
        <AulaCelda key={aula.id} aula={aula} onClick={() => onAbrirAula(aula.id)} />
      ))}
    </div>
  );
}

// El zoom vive acá y la URL firmada se fija al abrir: el refresco de 30 s trae una URL nueva
// en cada respuesta y recargaría la imagen. Si la fijada deja de servir, se prueba una vez con
// la última antes de dar el plano por perdido.
function PisoConPlano({
  plano,
  ubicadas,
  sinUbicar,
  onAbrirAula,
}: {
  plano: PlanoImagenDto;
  ubicadas: AulaUbicada[];
  sinUbicar: PlanoAulaDto[];
  onAbrirAula: (aulaId: string) => void;
}) {
  const [zoom, setZoom] = useState(zoomMinimo);
  const [imagenUrl, setImagenUrl] = useState(plano.imagenUrl);
  const [fallida, setFallida] = useState(false);

  if (fallida) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>No se pudo cargar el plano de este piso</AlertDescription>
        </Alert>
        <GrillaAulas aulas={[...ubicadas, ...sinUbicar]} onAbrirAula={onAbrirAula} />
      </div>
    );
  }

  const imagenFallida = () => {
    if (plano.imagenUrl !== imagenUrl) setImagenUrl(plano.imagenUrl);
    else setFallida(true);
  };

  return (
    <>
      <PlanoPiso
        plano={plano}
        imagenUrl={imagenUrl}
        aulas={ubicadas}
        zoom={zoom}
        onZoomChange={setZoom}
        onAbrirAula={onAbrirAula}
        onImagenFallida={imagenFallida}
      />
      {sinUbicar.length > 0 ? (
        <section aria-label="Sin ubicar" className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Sin ubicar</h4>
          <GrillaAulas aulas={sinUbicar} onAbrirAula={onAbrirAula} />
        </section>
      ) : null}
    </>
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
  const { plano, ubicadas, sinUbicar } = repartirAulasDelPiso(aulas);
  return (
    <section aria-label={piso} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-heading text-base font-semibold">{piso}</h3>
        <p className="text-muted-foreground text-sm">{conteo}</p>
      </div>
      {plano ? (
        <PisoConPlano
          key={`${plano.id}:${rutaDeLaImagen(plano.imagenUrl)}`}
          plano={plano}
          ubicadas={ubicadas}
          sinUbicar={sinUbicar}
          onAbrirAula={onAbrirAula}
        />
      ) : (
        <GrillaAulas aulas={aulas} onAbrirAula={onAbrirAula} />
      )}
    </section>
  );
}

// Plano de aulas (RF-02, RF-07): todos los pisos del edificio apilados, cada uno con su conteo
// y la imagen del piso con sus aulas sobre el polígono (o, sin plano, la grilla por código). Se actualiza por
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
