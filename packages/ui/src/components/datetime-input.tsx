"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Calendar } from "@repo/ui/components/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { TimeInput, normalizarHora } from "@repo/ui/components/time-input";
import { cn } from "@repo/ui/lib/utils";

const fechaPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Devuelve "yyyy-MM-dd" si el texto `dd/mm/aaaa` es un día real; `null` si no. */
export function normalizarFecha(texto: string): string | null {
  const coincidencia = fechaPattern.exec(texto.trim());
  if (!coincidencia) return null;
  const [dia, mes, anio] = coincidencia.slice(1).map(Number) as [number, number, number];
  const fecha = new Date(anio, mes - 1, dia);
  const esReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return esReal ? format(fecha, "yyyy-MM-dd") : null;
}

const fechaATexto = (fecha: string) => fecha.split("-").reverse().join("/");

const separar = (value: string): [string, string] => {
  const [fecha = "", hora = ""] = value.split("T");
  return [fecha && normalizarFecha(fechaATexto(fecha)) ? fechaATexto(fecha) : fecha, hora];
};

const completarBarras = (texto: string, anterior: string) =>
  /^\d{2}(\/\d{2})?$/.test(texto) && texto.length > anterior.length ? `${texto}/` : texto;

type DateTimeInputProps = {
  id?: string;
  /** "yyyy-MM-ddTHH:mm" en hora local de quien lo carga, o "" si está vacío. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  horaLabel?: string;
  className?: string;
};

function DateTimeInput({
  id,
  value,
  onChange,
  onBlur,
  name,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  horaLabel = "Hora",
}: DateTimeInputProps) {
  const [fechaInicial, horaInicial] = separar(value);
  const [fechaTexto, setFechaTexto] = React.useState(fechaInicial);
  const [horaTexto, setHoraTexto] = React.useState(horaInicial);
  const [abierto, setAbierto] = React.useState(false);

  const combinar = (fecha: string, hora: string) => {
    if (!fecha && !hora) return "";
    const fechaIso = normalizarFecha(fecha);
    const horaNormal = normalizarHora(hora);
    return fechaIso && horaNormal ? `${fechaIso}T${horaNormal}` : `${fecha}T${hora}`;
  };

  React.useEffect(() => {
    if (combinar(fechaTexto, horaTexto) === value) return;
    const [fecha, hora] = separar(value);
    setFechaTexto(fecha);
    setHoraTexto(hora);
    // Solo reacciona a cambios externos: lo tipeado ya se emitió.
  }, [value]);

  const cambiar = (fecha: string, hora: string) => {
    setFechaTexto(fecha);
    setHoraTexto(hora);
    onChange(combinar(fecha, hora));
  };

  const fechaIso = normalizarFecha(fechaTexto);
  const seleccionada = fechaIso ? new Date(`${fechaIso}T12:00:00`) : undefined;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <InputGroup className="w-auto min-w-40 flex-1">
        <InputGroupInput
          id={id}
          name={name}
          value={fechaTexto}
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          onChange={(event) =>
            cambiar(completarBarras(event.target.value.replace(/\/+/g, "/"), fechaTexto), horaTexto)
          }
          onBlur={() => {
            if (fechaIso) setFechaTexto(fechaATexto(fechaIso));
            onBlur?.();
          }}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={abierto} onOpenChange={setAbierto}>
            <PopoverTrigger
              render={
                <InputGroupButton size="icon-xs" aria-label="Elegir fecha" disabled={disabled} />
              }
            >
              <CalendarIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                locale={es}
                selected={seleccionada}
                defaultMonth={seleccionada}
                onSelect={(dia) => {
                  if (!dia) return;
                  cambiar(format(dia, "dd/MM/yyyy"), horaTexto);
                  setAbierto(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      <TimeInput
        value={horaTexto}
        aria-label={horaLabel}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onChange={(hora) => cambiar(fechaTexto, hora)}
        onBlur={onBlur}
      />
    </div>
  );
}

export { DateTimeInput };
