import { turnoLabels, type FranjaTurno, type Turno } from "@repo/domain";

export const describirRango = ({ inicio, fin }: FranjaTurno) => `${inicio} – ${fin}`;

export const describirTurno = (turno: Turno, franja: FranjaTurno) =>
  `${turnoLabels[turno]} ${describirRango(franja)}`;
