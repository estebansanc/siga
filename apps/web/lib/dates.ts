import { argentinaTimeZone } from "@repo/domain";
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

// "martes 14 de octubre", a partir de una fecha `yyyy-mm-dd`.
export const formatFechaLarga = (fecha: string) =>
  format(new Date(`${fecha}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });

// "14/10/2026", a partir de una fecha `yyyy-mm-dd`.
export const formatFechaCorta = (fecha: string) => fecha.split("-").reverse().join("/");
