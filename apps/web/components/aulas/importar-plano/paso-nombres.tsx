"use client";

import type { AulaGestionDto, PlanoPisoDto } from "@repo/api/client";
import { capacidadAulaMax, capacidadAulaMin } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { DialogFooter } from "@repo/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";

import { errorDeCapacidad, evaluarNombres, type AulaEditable } from "./aulas-editables";
import { LienzoPlano } from "./lienzo-plano";

type PasoNombresProps = {
  plano: PlanoPisoDto;
  aulas: AulaEditable[];
  existentes: AulaGestionDto[];
  capacidadPorDefecto: string;
  onCapacidadPorDefecto: (valor: string) => void;
  onCambiar: (aulas: AulaEditable[]) => void;
  onVolver: () => void;
  onContinuar: () => void;
};

export function PasoNombres({
  plano,
  aulas,
  existentes,
  capacidadPorDefecto,
  onCapacidadPorDefecto,
  onCambiar,
  onVolver,
  onContinuar,
}: PasoNombresProps) {
  const [enfocada, setEnfocada] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);
  const tildadas = aulas.filter((aula) => aula.tildada);
  const estados = evaluarNombres(tildadas, existentes, plano);
  const errorPorDefecto = errorDeCapacidad(capacidadPorDefecto, true);
  const errorDeFila = (aula: AulaEditable) => errorDeCapacidad(aula.capacidad, false);
  const hayErrores =
    errorPorDefecto !== null ||
    tildadas.some((aula) => estados.get(aula.id)?.error || errorDeFila(aula));

  const cambiar = (id: string, cambios: Partial<AulaEditable>) =>
    onCambiar(aulas.map((aula) => (aula.id === id ? { ...aula, ...cambios } : aula)));

  const continuar = () => {
    setIntento(true);
    if (!hayErrores) onContinuar();
  };

  return (
    <div className="flex flex-col gap-4">
      <LienzoPlano
        imagenUrl={plano.imagenUrl}
        ancho={plano.ancho}
        alto={plano.alto}
        aulas={tildadas}
        resaltadaId={enfocada}
      />
      <FieldGroup>
        <Field data-invalid={intento && errorPorDefecto !== null}>
          <FieldLabel htmlFor="plano-capacidad-defecto">Capacidad por defecto</FieldLabel>
          <Input
            id="plano-capacidad-defecto"
            type="number"
            inputMode="numeric"
            min={capacidadAulaMin}
            max={capacidadAulaMax}
            value={capacidadPorDefecto}
            onChange={(evento) => onCapacidadPorDefecto(evento.target.value)}
          />
          <FieldDescription>La reciben las aulas nuevas sin capacidad propia.</FieldDescription>
          <FieldError>{intento ? errorPorDefecto : null}</FieldError>
        </Field>
        {tildadas.map((aula, indice) => {
          const estado = estados.get(aula.id);
          const error = intento || aula.nombre ? (estado?.error ?? null) : null;
          const errorCapacidad = errorDeFila(aula);
          return (
            <div key={aula.id} className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`aula-nombre-${aula.id}`}>
                  Aula {indice + 1}: nombre
                </FieldLabel>
                <Input
                  id={`aula-nombre-${aula.id}`}
                  value={aula.nombre}
                  aria-invalid={Boolean(error)}
                  onChange={(evento) => cambiar(aula.id, { nombre: evento.target.value })}
                  onFocus={() => setEnfocada(aula.id)}
                  onBlur={() => setEnfocada(null)}
                />
                {estado?.ubicara ? (
                  <FieldDescription>Ya existe: se ubicará</FieldDescription>
                ) : null}
                <FieldError>{error}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errorCapacidad)}>
                <FieldLabel htmlFor={`aula-capacidad-${aula.id}`}>
                  Aula {indice + 1}: capacidad
                </FieldLabel>
                <Input
                  id={`aula-capacidad-${aula.id}`}
                  type="number"
                  inputMode="numeric"
                  placeholder="Por defecto"
                  min={capacidadAulaMin}
                  max={capacidadAulaMax}
                  value={aula.capacidad}
                  onChange={(evento) => cambiar(aula.id, { capacidad: evento.target.value })}
                  onFocus={() => setEnfocada(aula.id)}
                  onBlur={() => setEnfocada(null)}
                />
                <FieldError>{errorCapacidad}</FieldError>
              </Field>
            </div>
          );
        })}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" onClick={continuar}>
          Continuar
        </Button>
      </DialogFooter>
    </div>
  );
}
