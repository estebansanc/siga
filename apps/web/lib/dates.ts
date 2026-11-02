import { argentinaTimeZone, fechaArgentina, horaArgentina, sumarDias } from "@repo/domain";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const formatDate = (value: Date | string, pattern = "d MMM yyyy") =>
  format(new Date(value), pattern, { locale: es });

export const formatDateTime = (value: Date | string) => formatDate(value, "d MMM yyyy, HH:mm");

// Las fechas de negocio de SiGA se muestran en hora argentina (DAT-1), sin importar la zona
// del navegador.
const horaArgentinaFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: argentinaTimeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const fechaHoraArgentinaFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: argentinaTimeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatHora = (value: Date | string) => horaArgentinaFormatter.format(new Date(value));

// `dd/mm/aaaa hh:mm`, el formato de DAT-1.
export const formatFechaHora = (value: Date | string) =>
  fechaHoraArgentinaFormatter.format(new Date(value)).replace(",", "");

// Desde cuándo rige algo, según el día argentino en que empezó: "las 15:32", "ayer 15:32" o
// "el 21/10/2026 17:20".
export const formatDesde = (desde: Date | string, ahora: Date = new Date()) => {
  const instante = new Date(desde);
  const diaDesde = fechaArgentina(instante);
  const hoy = fechaArgentina(ahora);
  if (diaDesde === hoy) return `las ${formatHora(instante)}`;
  if (diaDesde === sumarDias(hoy, -1)) return `ayer ${formatHora(instante)}`;
  return `el ${formatFechaHora(instante)}`;
};

// "martes 14 de octubre", a partir de una fecha `yyyy-mm-dd`.
export const formatFechaLarga = (fecha: string) =>
  format(new Date(`${fecha}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });

export const capitalizarPrimera = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// "14/10/2026", a partir de una fecha `yyyy-mm-dd`.
export const formatFechaCorta = (fecha: string) => fecha.split("-").reverse().join("/");

// El `datetime-local` entrega "2026-10-14T23:30" sin zona: es hora argentina (DAT-1). Vacío
// queda como "" para que el esquema lo trate como no informado.
export const inputArgentinoAIso = (value: unknown) =>
  typeof value === "string" && value ? `${value}:00-03:00` : "";

// Inversa de `inputArgentinoAIso`: lo que el control de fecha y hora necesita para mostrarse.
export const isoArgentinoAInput = (valor: unknown) =>
  typeof valor === "string" ? valor.replace(/:00-03:00$/, "") : "";

export const isoAInputArgentino = (iso: string) => {
  const instante = new Date(iso);
  return `${fechaArgentina(instante)}T${horaArgentina(instante)}`;
};

// dd/mm/aaaa del día argentino en que ocurrió el instante.
export const formatInstanteCorto = (instante: string) =>
  formatFechaCorta(fechaArgentina(new Date(instante)));
