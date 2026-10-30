"use client";

import { ClockIcon } from "lucide-react";
import * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";

const horaPattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const rango = (cantidad: number) =>
  Array.from({ length: cantidad }, (_, indice) => String(indice).padStart(2, "0"));

const horas = rango(24);
const minutos = rango(60);

/** Devuelve "HH:mm" si el texto es una hora válida de 24 h; `null` si no. */
export function normalizarHora(texto: string): string | null {
  const coincidencia = horaPattern.exec(texto.trim());
  return coincidencia ? `${coincidencia[1]!.padStart(2, "0")}:${coincidencia[2]}` : null;
}

const completarSeparador = (texto: string, anterior: string) =>
  /^\d{2}$/.test(texto) && texto.length > anterior.length ? `${texto}:` : texto;

type TimeInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  className?: string;
};

function OpcionesDeTiempo({
  ref,
  etiqueta,
  opciones,
  seleccionada,
  onElegir,
}: {
  ref?: React.Ref<HTMLDivElement>;
  etiqueta: string;
  opciones: string[];
  seleccionada: string | undefined;
  onElegir: (opcion: string) => void;
}) {
  const moverFoco = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const paso = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    event.preventDefault();
    const botones = Array.from(event.currentTarget.querySelectorAll("button"));
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    botones[Math.min(Math.max(actual + paso, 0), botones.length - 1)]?.focus();
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={etiqueta}
      onKeyDown={moverFoco}
      className="flex max-h-48 w-14 flex-col gap-0.5 overflow-y-auto"
    >
      {opciones.map((opcion) => (
        <Button
          key={opcion}
          type="button"
          role="option"
          size="sm"
          variant={opcion === seleccionada ? "default" : "ghost"}
          aria-selected={opcion === seleccionada}
          tabIndex={opcion === (seleccionada ?? opciones[0]) ? 0 : -1}
          ref={(boton) => {
            if (boton && opcion === seleccionada) boton.scrollIntoView?.({ block: "nearest" });
          }}
          onClick={() => onElegir(opcion)}
          className="tabular-nums"
        >
          {opcion}
        </Button>
      ))}
    </div>
  );
}

function TimeInput({
  id,
  value,
  onChange,
  onBlur,
  name,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: TimeInputProps) {
  const [texto, setTexto] = React.useState(value);
  const [abierto, setAbierto] = React.useState(false);
  const horasRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTexto((actual) => (actual === value || normalizarHora(actual) === value ? actual : value));
  }, [value]);

  const hora = normalizarHora(texto);
  const [horaElegida, minutoElegido] = hora ? hora.split(":") : [undefined, undefined];

  const escribir = (siguiente: string) => {
    const completo = completarSeparador(siguiente.replace(/:+/g, ":"), texto);
    setTexto(completo);
    onChange(normalizarHora(completo) ?? completo);
  };

  const elegir = (nuevaHora: string, nuevoMinuto: string) => {
    const elegida = `${nuevaHora}:${nuevoMinuto}`;
    setTexto(elegida);
    onChange(elegida);
  };

  return (
    <InputGroup className={cn("w-auto min-w-28", className)}>
      <InputGroupInput
        id={id}
        name={name}
        value={texto}
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:mm"
        maxLength={5}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        onChange={(event) => escribir(event.target.value)}
        onBlur={() => {
          if (hora) setTexto(hora);
          onBlur?.();
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger
            render={
              <InputGroupButton size="icon-xs" aria-label="Elegir hora" disabled={disabled} />
            }
          >
            <ClockIcon />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-auto flex-row gap-2"
            initialFocus={() =>
              horasRef.current?.querySelector<HTMLElement>("[tabindex='0']") ?? true
            }
          >
            <OpcionesDeTiempo
              ref={horasRef}
              etiqueta="Horas"
              opciones={horas}
              seleccionada={horaElegida}
              onElegir={(opcion) => elegir(opcion, minutoElegido ?? "00")}
            />
            <OpcionesDeTiempo
              etiqueta="Minutos"
              opciones={minutos}
              seleccionada={minutoElegido}
              onElegir={(opcion) => {
                elegir(horaElegida ?? "00", opcion);
                setAbierto(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { TimeInput };
