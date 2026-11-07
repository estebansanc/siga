"use client";

import type { PlanoPisoDto } from "@repo/api/client";
import type { Poligono, Punto } from "@repo/domain";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { DialogFooter } from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { InfoIcon, PencilRulerIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useState } from "react";

import { aulaDibujada, nombreDelAula, type AulaEditable } from "./aulas-editables";
import { LienzoPlano } from "./lienzo-plano";

const zoomMinimo = 1;
const zoomMaximo = 4;
const pasoDeZoom = 0.5;

type PasoDeteccionProps = {
  plano: PlanoPisoDto;
  aulas: AulaEditable[];
  aviso: string | null;
  onCambiar: (aulas: AulaEditable[]) => void;
  onContinuar: () => void;
  onCancelar: () => void;
};

export function PasoDeteccion({
  plano,
  aulas,
  aviso,
  onCambiar,
  onContinuar,
  onCancelar,
}: PasoDeteccionProps) {
  const [zoom, setZoom] = useState(1);
  const [dibujando, setDibujando] = useState(false);
  const [sinTildar, setSinTildar] = useState(false);
  const tildadas = aulas.filter((aula) => aula.tildada).length;

  const alternar = (aulaId: string) =>
    onCambiar(
      aulas.map((aula) => (aula.id === aulaId ? { ...aula, tildada: !aula.tildada } : aula)),
    );

  const moverVertice = (aulaId: string, vertice: number, punto: Punto) =>
    onCambiar(
      aulas.map((aula) =>
        aula.id === aulaId
          ? {
              ...aula,
              poligono: aula.poligono.map((actual, i) => (i === vertice ? punto : actual)),
            }
          : aula,
      ),
    );

  const agregar = (poligono: Poligono) => {
    onCambiar([...aulas, aulaDibujada(`dibujada-${crypto.randomUUID()}`, poligono)]);
    setDibujando(false);
  };

  const continuar = () => {
    if (tildadas === 0) return setSinTildar(true);
    onContinuar();
  };

  return (
    <div className="flex flex-col gap-4">
      {aviso ? (
        <Alert>
          <InfoIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Tocá un aula para tildarla o destildarla y arrastrá sus vértices para ajustarla. Solo las
        tildadas se importan.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={dibujando ? "default" : "outline"}
          aria-pressed={dibujando}
          onClick={() => setDibujando(!dibujando)}
        >
          <PencilRulerIcon />
          Dibujar aula
        </Button>
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Alejar"
            disabled={zoom <= zoomMinimo}
            onClick={() => setZoom(Math.max(zoom - pasoDeZoom, zoomMinimo))}
          >
            <ZoomOutIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Acercar"
            disabled={zoom >= zoomMaximo}
            onClick={() => setZoom(Math.min(zoom + pasoDeZoom, zoomMaximo))}
          >
            <ZoomInIcon />
          </Button>
        </div>
      </div>
      {dibujando ? <p className="text-sm">Arrastrá sobre el plano para dibujar el aula.</p> : null}
      <LienzoPlano
        imagenUrl={plano.imagenUrl}
        ancho={plano.ancho}
        alto={plano.alto}
        aulas={aulas}
        zoom={zoom}
        dibujando={dibujando}
        onAlternar={alternar}
        onMoverVertice={moverVertice}
        onDibujar={agregar}
      />
      {aulas.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Aulas detectadas">
          {aulas.map((aula) => (
            <li key={aula.id}>
              <Label className="font-normal">
                <Checkbox checked={aula.tildada} onCheckedChange={() => alternar(aula.id)} />
                {nombreDelAula(aula)}
                {aula.dudosa ? <Badge variant="outline">Dudosa</Badge> : null}
              </Label>
            </li>
          ))}
        </ul>
      ) : null}
      {sinTildar && tildadas === 0 ? (
        <p role="alert" className="text-destructive text-sm">
          Tildá o dibujá al menos un aula para continuar
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={continuar}>
          Continuar
        </Button>
      </DialogFooter>
    </div>
  );
}
