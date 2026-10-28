import { argentinaTimeZone } from "./tiempo";

export const maxIntentosFallidos = 5;
export const minutosDeBloqueo = 15;
export const horasDeInactividad = 8;

export type EstadoBloqueo = { intentosFallidos: number; bloqueadoHasta: Date | null };

export const sinBloqueo: EstadoBloqueo = { intentosFallidos: 0, bloqueadoHasta: null };

export const estaBloqueada = (estado: EstadoBloqueo, ahora: Date) =>
  estado.bloqueadoHasta !== null && estado.bloqueadoHasta.getTime() > ahora.getTime();

// Pasado el bloqueo el contador vuelve a cero.
export const estadoVigente = (estado: EstadoBloqueo, ahora: Date): EstadoBloqueo =>
  estado.bloqueadoHasta !== null && !estaBloqueada(estado, ahora) ? sinBloqueo : estado;

export const registrarIntentoFallido = (estado: EstadoBloqueo, ahora: Date): EstadoBloqueo => {
  const intentosFallidos = estado.intentosFallidos + 1;
  if (intentosFallidos < maxIntentosFallidos) return { intentosFallidos, bloqueadoHasta: null };
  return {
    intentosFallidos,
    bloqueadoHasta: new Date(ahora.getTime() + minutosDeBloqueo * 60 * 1000),
  };
};

const horaFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: argentinaTimeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const mensajeCuentaBloqueada = (bloqueadoHasta: Date) =>
  `Cuenta bloqueada temporalmente. Podés volver a intentar a las ${horaFormatter.format(bloqueadoHasta)}.`;
