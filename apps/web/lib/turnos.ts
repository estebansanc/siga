import { turnoLabels, type FranjaTurno, type Turno } from "@repo/domain";

const sinCeroInicial = (hora: string) => hora.replace(/^0/, "");

export const describirRango = ({ inicio, fin }: FranjaTurno) =>
  `${sinCeroInicial(inicio)}–${sinCeroInicial(fin)}`;

export const describirTurno = (turno: Turno, franja: FranjaTurno) =>
  `${turnoLabels[turno]} ${describirRango(franja)}`;
