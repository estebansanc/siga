import { diaSemanaDe, fechasEntre, sumarDias } from "@repo/domain";

export type DiaNoLaborableCargado = { fecha: string; activo: boolean };

export type FechasDeClases = {
  inicio: string;
  fin: string;
  diaSemana: number;
  diaNoLaborable: string;
  claseGenerada: string;
  clasesEsperadas: number;
};

const diasDeLaSemana = [1, 2, 3, 4, 5, 6, 7];

// Arma un período de mañana a dentro de 30 días y elige el día de la semana del horario de
// modo que, aun con los días no laborables que ya hay cargados (seed o corridas anteriores),
// quede una fecha libre para el día no laborable del test y otra con clase generada.
export const planearFechasDeClases = (
  hoy: string,
  cargados: DiaNoLaborableCargado[],
): FechasDeClases => {
  const inicio = sumarDias(hoy, 1);
  const fin = sumarDias(hoy, 30);
  const ocupadas = new Set(cargados.map((dia) => dia.fecha));
  const inactivas = new Set(cargados.filter((dia) => !dia.activo).map((dia) => dia.fecha));
  const fechas = fechasEntre(inicio, fin);

  for (const diaSemana of diasDeLaSemana) {
    const delDia = fechas.filter((fecha) => diaSemanaDe(fecha) === diaSemana);
    const libres = delDia.filter((fecha) => !ocupadas.has(fecha));
    const [diaNoLaborable] = libres;
    const conClase = delDia.filter((fecha) => !ocupadas.has(fecha) || inactivas.has(fecha));
    const claseGenerada = conClase.find((fecha) => fecha !== diaNoLaborable);
    if (!diaNoLaborable || !claseGenerada) continue;
    const clasesEsperadas = conClase.filter((fecha) => fecha !== diaNoLaborable).length;
    return { inicio, fin, diaSemana, diaNoLaborable, claseGenerada, clasesEsperadas };
  }
  throw new Error("No hay un día de la semana con fechas libres para el período del test");
};
