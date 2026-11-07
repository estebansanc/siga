"use client";

import { centroideDePoligono, type Poligono, type Punto } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { useRef, useState, type PointerEvent } from "react";

import { nombreDelAula, type AulaEditable } from "./aulas-editables";

const ladoMinimoDibujado = 0.015;

type Arrastre = { aulaId: string; vertice: number };
type Dibujo = { inicio: Punto; actual: Punto };

type LienzoPlanoProps = {
  imagenUrl: string;
  ancho: number;
  alto: number;
  aulas: AulaEditable[];
  zoom?: number;
  resaltadaId?: string | null;
  mostrarNombres?: boolean;
  dibujando?: boolean;
  onAlternar?: (aulaId: string) => void;
  onMoverVertice?: (aulaId: string, vertice: number, punto: Punto) => void;
  onDibujar?: (poligono: Poligono) => void;
};

const rectanguloEntre = (a: Punto, b: Punto): Poligono => {
  const [x1, x2] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y1, y2] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
};

const acotar = (valor: number) => Math.min(Math.max(valor, 0), 1);

export function LienzoPlano({
  imagenUrl,
  ancho,
  alto,
  aulas,
  zoom = 1,
  resaltadaId = null,
  mostrarNombres = false,
  dibujando = false,
  onAlternar,
  onMoverVertice,
  onDibujar,
}: LienzoPlanoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [dibujo, setDibujo] = useState<Dibujo | null>(null);
  const editable = Boolean(onMoverVertice);
  const radio = ancho * 0.009;
  const tamanoTexto = ancho * 0.02;

  const puntoDe = (evento: PointerEvent): Punto => {
    const caja = svgRef.current?.getBoundingClientRect();
    if (!caja || caja.width === 0 || caja.height === 0) return { x: 0, y: 0 };
    return {
      x: acotar((evento.clientX - caja.left) / caja.width),
      y: acotar((evento.clientY - caja.top) / caja.height),
    };
  };

  const enPuntos = (poligono: Poligono) =>
    poligono.map((punto) => `${punto.x * ancho},${punto.y * alto}`).join(" ");

  const empezarDibujo = (evento: PointerEvent) => {
    if (!dibujando) return;
    svgRef.current?.setPointerCapture?.(evento.pointerId);
    const inicio = puntoDe(evento);
    setDibujo({ inicio, actual: inicio });
  };

  const mover = (evento: PointerEvent) => {
    if (arrastre) onMoverVertice?.(arrastre.aulaId, arrastre.vertice, puntoDe(evento));
    else if (dibujo) setDibujo({ ...dibujo, actual: puntoDe(evento) });
  };

  const soltar = (evento: PointerEvent) => {
    if (dibujo) {
      const final = puntoDe(evento);
      const grande =
        Math.abs(final.x - dibujo.inicio.x) >= ladoMinimoDibujado &&
        Math.abs(final.y - dibujo.inicio.y) >= ladoMinimoDibujado;
      onDibujar?.(
        rectanguloEntre(
          dibujo.inicio,
          grande ? final : { x: acotar(dibujo.inicio.x + 0.1), y: acotar(dibujo.inicio.y + 0.08) },
        ),
      );
    }
    setDibujo(null);
    setArrastre(null);
  };

  return (
    <div className="bg-muted/30 max-h-[55dvh] overflow-auto rounded-lg border">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ancho} ${alto}`}
        style={{ width: `${zoom * 100}%` }}
        className={cn(
          "block h-auto max-w-none select-none",
          dibujando && "cursor-crosshair touch-none",
        )}
        role="img"
        aria-label="Plano del piso"
        onPointerDown={empezarDibujo}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <image href={imagenUrl} width={ancho} height={alto} />
        {aulas.map((aula) => {
          const resaltada = aula.id === resaltadaId;
          return (
            <g key={aula.id} className={dibujando ? "pointer-events-none" : undefined}>
              <polygon
                points={enPuntos(aula.poligono)}
                role={onAlternar ? "button" : undefined}
                tabIndex={onAlternar ? 0 : undefined}
                aria-pressed={onAlternar ? aula.tildada : undefined}
                aria-label={
                  onAlternar ? `${nombreDelAula(aula)}${aula.dudosa ? ", dudosa" : ""}` : undefined
                }
                strokeWidth={ancho * (resaltada ? 0.006 : 0.003)}
                className={cn(
                  "focus-visible:stroke-ring outline-none transition-colors",
                  onAlternar && "cursor-pointer",
                  aula.tildada
                    ? "fill-primary/25 stroke-primary"
                    : "fill-muted-foreground/10 stroke-muted-foreground",
                  !aula.tildada && "[stroke-dasharray:8_6]",
                  resaltada && "fill-primary/50",
                )}
                onClick={() => onAlternar?.(aula.id)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    onAlternar?.(aula.id);
                  }
                }}
              />
              {mostrarNombres && aula.tildada ? (
                <text
                  x={centroideDePoligono(aula.poligono).x * ancho}
                  y={centroideDePoligono(aula.poligono).y * alto}
                  fontSize={tamanoTexto}
                  textAnchor="middle"
                  dominantBaseline="central"
                  strokeWidth={tamanoTexto * 0.25}
                  className="fill-foreground stroke-background pointer-events-none font-medium [paint-order:stroke]"
                >
                  {nombreDelAula(aula)}
                </text>
              ) : null}
              {editable && aula.tildada
                ? aula.poligono.map((punto, vertice) => (
                    <circle
                      key={vertice}
                      cx={punto.x * ancho}
                      cy={punto.y * alto}
                      r={radio}
                      data-testid={`vertice-${aula.id}-${vertice}`}
                      className="fill-background stroke-primary cursor-grab touch-none"
                      strokeWidth={ancho * 0.003}
                      onPointerDown={(evento) => {
                        evento.stopPropagation();
                        svgRef.current?.setPointerCapture?.(evento.pointerId);
                        setArrastre({ aulaId: aula.id, vertice });
                      }}
                    />
                  ))
                : null}
            </g>
          );
        })}
        {dibujo ? (
          <polygon
            points={enPuntos(rectanguloEntre(dibujo.inicio, dibujo.actual))}
            className="fill-primary/20 stroke-primary pointer-events-none"
            strokeWidth={ancho * 0.003}
          />
        ) : null}
      </svg>
    </div>
  );
}
