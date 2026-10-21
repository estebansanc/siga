import { diaSemanaDe, fechasEntre, instanteArgentino } from "@repo/domain";

import type { Db } from "./client";

// Columnas `@db.Date`: Prisma las lee y escribe como medianoche UTC.
export const toDateColumn = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);
export const fromDateColumn = (value: Date) => value.toISOString().slice(0, 10);

export type ResumenGeneracion = { creadas: number; existentes: number; sinAula: number };

type Filtro = { periodoLectivoId?: string; comisionId?: string };

// RF-13: una clase por comisión, fecha y franja entre el inicio y el fin del período, sin
// días no laborables. Nace Programada con el aula habitual, salvo que el aula no esté
// disponible o ya tenga otra clase en esa franja (CA-09): entonces queda sin aula.
export const generarClasesProgramadas = async (
  db: Db,
  organizationId: string,
  filtro: Filtro = {},
): Promise<ResumenGeneracion> => {
  const comisiones = await db.comision.findMany({
    where: {
      organizationId,
      activa: true,
      id: filtro.comisionId,
      periodoLectivoId: filtro.periodoLectivoId,
    },
    include: { periodoLectivo: true, horarios: { include: { aulaHabitual: true } } },
  });
  const diasNoLaborables = new Set(
    (await db.diaNoLaborable.findMany({ where: { organizationId } })).map((dia) =>
      fromDateColumn(dia.fecha),
    ),
  );
  const resumen: ResumenGeneracion = { creadas: 0, existentes: 0, sinAula: 0 };

  for (const comision of comisiones) {
    const existentes = new Set(
      (
        await db.claseProgramada.findMany({
          where: { comisionId: comision.id },
          select: { inicio: true },
        })
      ).map((clase) => clase.inicio.getTime()),
    );
    const fechas = fechasEntre(
      fromDateColumn(comision.periodoLectivo.fechaInicio),
      fromDateColumn(comision.periodoLectivo.fechaFin),
    ).filter((fecha) => !diasNoLaborables.has(fecha));

    for (const horario of comision.horarios) {
      for (const fecha of fechas) {
        if (diaSemanaDe(fecha) !== horario.diaSemana) continue;
        const inicio = instanteArgentino(fecha, horario.horaInicio);
        const fin = instanteArgentino(fecha, horario.horaFin);
        if (existentes.has(inicio.getTime())) {
          resumen.existentes += 1;
          continue;
        }
        const aulaId = await aulaDisponiblePara(db, horario.aulaHabitual, inicio, fin);
        if (!aulaId) resumen.sinAula += 1;
        await db.claseProgramada.create({
          data: {
            organizationId,
            comisionId: comision.id,
            horarioId: horario.id,
            fecha: toDateColumn(fecha),
            inicio,
            fin,
            aulaId,
          },
        });
        resumen.creadas += 1;
      }
    }
  }
  return resumen;
};

const aulaDisponiblePara = async (
  db: Db,
  aula: { id: string; activa: boolean; estado: string } | null,
  inicio: Date,
  fin: Date,
) => {
  if (!aula || !aula.activa || aula.estado !== "DISPONIBLE") return null;
  const ocupada = await db.claseProgramada.findFirst({
    where: { aulaId: aula.id, inicio: { lt: fin }, fin: { gt: inicio } },
    select: { id: true },
  });
  return ocupada ? null : aula.id;
};
