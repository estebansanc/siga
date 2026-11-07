"use client";

import type { PlanoAulaDto, PlanoImagenDto } from "@repo/api/client";
import {
  centroideDePoligono,
  estadoPlanoLabels,
  estadoPlanoSchema,
  zoomMinimo,
  type Poligono,
} from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { useEffect, useRef, type PointerEvent } from "react";

import type { Tono } from "@/components/estado-tonos";

import { ControlesZoom } from "./controles-zoom";
import { PlanoEstadoBadge, planoEstadoPresentacion } from "./plano-estado-badge";

const umbralDeArrastre = 4;

const poligonoTonoClassNames: Record<Tono, string> = {
  verde: "fill-green-500/35 stroke-green-700 text-green-900 dark:text-green-100",
  amarillo: "fill-yellow-500/35 stroke-yellow-700 text-yellow-900 dark:text-yellow-100",
  naranja: "fill-orange-500/35 stroke-orange-700 text-orange-900 dark:text-orange-100",
  rojo: "fill-red-500/35 stroke-red-700 text-red-900 dark:text-red-100",
  azul: "fill-blue-500/35 stroke-blue-700 text-blue-900 dark:text-blue-100",
  gris: "fill-gray-500/40 stroke-gray-600 text-gray-900 dark:text-gray-100",
};

const enPuntos = (poligono: Poligono, ancho: number, alto: number) =>
  poligono.map((punto) => `${punto.x * ancho},${punto.y * alto}`).join(" ");

function LeyendaEstados() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Estados de las aulas">
      {estadoPlanoSchema.options.map((estado) => (
        <li key={estado}>
          <PlanoEstadoBadge estado={estado} />
        </li>
      ))}
    </ul>
  );
}

export type AulaUbicada = PlanoAulaDto & { poligono: Poligono };

function AulaEnPlano({
  aula,
  ancho,
  alto,
  onAbrir,
}: {
  aula: AulaUbicada;
  ancho: number;
  alto: number;
  onAbrir: () => void;
}) {
  const { tono, icon: Icon } = planoEstadoPresentacion[aula.estado];
  const centro = centroideDePoligono(aula.poligono);
  const tamanoTexto = ancho * 0.016;
  const tamanoIcono = ancho * 0.022;
  const x = centro.x * ancho;
  const y = centro.y * alto;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${aula.codigo}, ${estadoPlanoLabels[aula.estado]}`}
      data-estado={aula.estado}
      className={cn(
        "focus-visible:[&>polygon]:stroke-ring cursor-pointer outline-none",
        poligonoTonoClassNames[tono],
      )}
      onClick={onAbrir}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          onAbrir();
        }
      }}
    >
      <polygon points={enPuntos(aula.poligono, ancho, alto)} strokeWidth={ancho * 0.003} />
      <Icon
        aria-hidden="true"
        x={x - tamanoIcono / 2}
        y={y - tamanoIcono - tamanoTexto * 0.1}
        width={tamanoIcono}
        height={tamanoIcono}
        className="pointer-events-none stroke-current"
        fill="none"
      />
      <text
        x={x}
        y={y + tamanoTexto * 0.2}
        fontSize={tamanoTexto}
        textAnchor="middle"
        dominantBaseline="hanging"
        className="pointer-events-none fill-current stroke-none font-semibold"
      >
        {aula.codigo}
      </text>
    </g>
  );
}

type PlanoPisoProps = {
  plano: PlanoImagenDto;
  imagenUrl: string;
  aulas: AulaUbicada[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onAbrirAula: (aulaId: string) => void;
  onImagenFallida: () => void;
};

type Arrastre = { x: number; y: number; left: number; top: number };

export function PlanoPiso({
  plano,
  imagenUrl,
  aulas,
  zoom,
  onZoomChange,
  onAbrirAula,
  onImagenFallida,
}: PlanoPisoProps) {
  const recuadro = useRef<HTMLDivElement>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const seArrastro = useRef(false);
  const imagen = useRef<SVGImageElement>(null);

  useEffect(() => {
    const el = imagen.current;
    el?.addEventListener("error", onImagenFallida);
    return () => el?.removeEventListener("error", onImagenFallida);
  }, [imagenUrl, onImagenFallida]);

  const empezar = (evento: PointerEvent<HTMLDivElement>) => {
    const el = recuadro.current;
    if (evento.pointerType !== "mouse" || !el) return;
    seArrastro.current = false;
    arrastre.current = {
      x: evento.clientX,
      y: evento.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
  };

  const mover = (evento: PointerEvent<HTMLDivElement>) => {
    const inicio = arrastre.current;
    const el = recuadro.current;
    if (!inicio || !el) return;
    const dx = evento.clientX - inicio.x;
    const dy = evento.clientY - inicio.y;
    if (Math.hypot(dx, dy) > umbralDeArrastre) seArrastro.current = true;
    el.scrollLeft = inicio.left - dx;
    el.scrollTop = inicio.top - dy;
  };

  const terminar = () => {
    arrastre.current = null;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ControlesZoom zoom={zoom} onChange={onZoomChange} conRestablecer />
      </div>
      <div
        ref={recuadro}
        data-testid="recuadro-plano"
        className={cn(
          "bg-muted/30 max-h-[65dvh] overflow-auto overscroll-contain rounded-lg border",
          zoom > zoomMinimo && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onClickCapture={(evento) => {
          if (!seArrastro.current) return;
          seArrastro.current = false;
          evento.stopPropagation();
        }}
      >
        <svg
          viewBox={`0 0 ${plano.ancho} ${plano.alto}`}
          style={{ width: `${zoom * 100}%` }}
          className="block h-auto max-w-none select-none"
          role="group"
          aria-label="Plano del piso"
        >
          <image ref={imagen} href={imagenUrl} width={plano.ancho} height={plano.alto} />
          {aulas.map((aula) => (
            <AulaEnPlano
              key={aula.id}
              aula={aula}
              ancho={plano.ancho}
              alto={plano.alto}
              onAbrir={() => onAbrirAula(aula.id)}
            />
          ))}
        </svg>
      </div>
      <LeyendaEstados />
    </div>
  );
}
