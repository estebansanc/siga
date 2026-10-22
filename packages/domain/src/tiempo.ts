import { z } from "zod";

// Argentina no tiene horario de verano: el desfase es fijo (DAT-1). Las fechas de negocio
// viajan como `yyyy-mm-dd` y las horas como `HH:mm`; los instantes, como Date (UTC).
export const argentinaTimeZone = "America/Argentina/Buenos_Aires";
export const argentinaOffset = "-03:00";
const argentinaOffsetMs = 3 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

export const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora con formato HH:mm");

export const instanteArgentino = (fecha: string, hora: string) =>
  new Date(`${fecha}T${hora}:00${argentinaOffset}`);

const enArgentina = (instante: Date) => new Date(instante.getTime() - argentinaOffsetMs);

export const fechaArgentina = (instante: Date) => enArgentina(instante).toISOString().slice(0, 10);

export const horaArgentina = (instante: Date) => enArgentina(instante).toISOString().slice(11, 16);

// [desde, hasta): el día completo en hora argentina.
export const rangoDelDia = (fecha: string) => {
  const desde = instanteArgentino(fecha, "00:00");
  return { desde, hasta: new Date(desde.getTime() + dayMs) };
};

// 1 = lunes … 7 = domingo (ISO), para que coincida con `Horario.diaSemana`.
export const diaSemanaDe = (fecha: string) => {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
};

export const sumarDias = (fecha: string, dias: number) =>
  new Date(new Date(`${fecha}T12:00:00Z`).getTime() + dias * dayMs).toISOString().slice(0, 10);

// Ambos extremos incluidos.
export const fechasEntre = (inicio: string, fin: string) => {
  const fechas: string[] = [];
  for (let fecha = inicio; fecha <= fin; fecha = sumarDias(fecha, 1)) fechas.push(fecha);
  return fechas;
};

// Mismo día del mes; si el mes destino no lo tiene (29/02 + 12 meses), el último día de ese mes.
export const sumarMeses = (fecha: string, meses: number) => {
  const [anio, mes, dia] = fecha.split("-").map(Number) as [number, number, number];
  const indiceMes = anio * 12 + (mes - 1) + meses;
  const anioDestino = Math.floor(indiceMes / 12);
  const mesDestino = indiceMes % 12;
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);
  return `${anioDestino}-${String(mesDestino + 1).padStart(2, "0")}-${String(diaDestino).padStart(2, "0")}`;
};
