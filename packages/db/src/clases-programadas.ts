import {
  diaSemanaDe,
  fechaArgentina,
  fechasEntre,
  instanteArgentino,
  sumarDias,
} from "@repo/domain";

import type { Db, DbTransaction } from "./client";
import type { Prisma } from "./generated/client";

// Columnas `@db.Date`: Prisma las lee y escribe como medianoche UTC.
export const toDateColumn = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);
export const fromDateColumn = (value: Date) => value.toISOString().slice(0, 10);

export type ResumenGeneracion = { creadas: number; existentes: number; sinAula: number };

type Ejecutor = Db | DbTransaction;

type Filtro = { periodoLectivoId?: string; comisionId?: string };

// RF-13: una clase por comisión, fecha y franja desde hoy hasta el fin del período, sin
// días no laborables ni bajas. Nace Programada con el aula habitual, salvo que el aula no esté
// disponible o ya tenga otra clase en esa franja (CA-09): entonces queda sin aula.
export const generarClasesProgramadas = async (
  db: Db,
  organizationId: string,
  filtro: Filtro = {},
  hoy = fechaArgentina(new Date()),
): Promise<ResumenGeneracion> => {
  const comisiones = await db.comision.findMany({
    where: {
      organizationId,
      activa: true,
      id: filtro.comisionId,
      periodoLectivoId: filtro.periodoLectivoId,
    },
    include: {
      periodoLectivo: true,
      horarios: { where: { activo: true }, include: { aulaHabitual: true } },
    },
  });
  const diasNoLaborables = new Set(
    (await db.diaNoLaborable.findMany({ where: { organizationId, activo: true } })).map((dia) =>
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
    const inicioPeriodo = fromDateColumn(comision.periodoLectivo.fechaInicio);
    const fechas = fechasEntre(
      inicioPeriodo > hoy ? inicioPeriodo : hoy,
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
  db: Ejecutor,
  aula: { id: string; activa: boolean; estado: string } | null,
  inicio: Date,
  fin: Date,
  excluirClaseId?: string,
) => {
  if (!aula || !aula.activa || aula.estado !== "DISPONIBLE") return null;
  const ocupada = await db.claseProgramada.findFirst({
    where: {
      aulaId: aula.id,
      inicio: { lt: fin },
      fin: { gt: inicio },
      ...(excluirClaseId ? { id: { not: excluirClaseId } } : {}),
    },
    select: { id: true },
  });
  return ocupada ? null : aula.id;
};

// Las clases que una baja o una edición del horario pueden tocar: futuras, todavía Programadas
// y sin novedades publicadas.
const clasesFuturasEditables = (
  where: Prisma.ClaseProgramadaWhereInput,
  ahora: Date,
): Prisma.ClaseProgramadaWhereInput => ({
  ...where,
  estado: "PROGRAMADA",
  inicio: { gt: ahora },
  novedades: { none: {} },
});

export const borrarClasesFuturas = async (
  db: Ejecutor,
  where: { horarioId: string } | { comisionId: string },
  ahora = new Date(),
) => {
  const { count } = await db.claseProgramada.deleteMany({
    where: clasesFuturasEditables(where, ahora),
  });
  return count;
};

// Editar el horario mueve sus clases futuras al nuevo día, franja y aula; las que ya no caben
// (fuera del período, día no laborable o franja ya ocupada por otra clase de la comisión) se borran.
export const reubicarClasesFuturas = async (
  db: Ejecutor,
  horarioId: string,
  diaSemanaAnterior: number,
  ahora = new Date(),
) => {
  const horario = await db.horario.findUniqueOrThrow({
    where: { id: horarioId },
    include: { aulaHabitual: true, comision: { include: { periodoLectivo: true } } },
  });
  const inicioPeriodo = fromDateColumn(horario.comision.periodoLectivo.fechaInicio);
  const finPeriodo = fromDateColumn(horario.comision.periodoLectivo.fechaFin);
  const diasNoLaborables = new Set(
    (
      await db.diaNoLaborable.findMany({
        where: { organizationId: horario.organizationId, activo: true },
      })
    ).map((dia) => fromDateColumn(dia.fecha)),
  );
  const clases = await db.claseProgramada.findMany({
    where: clasesFuturasEditables({ horarioId }, ahora),
    orderBy: { inicio: "asc" },
  });
  const desplazamiento = horario.diaSemana - diaSemanaAnterior;
  const hoy = fechaArgentina(ahora);

  for (const clase of clases) {
    const fecha = sumarDias(fromDateColumn(clase.fecha), desplazamiento);
    const inicio = instanteArgentino(fecha, horario.horaInicio);
    const fin = instanteArgentino(fecha, horario.horaFin);
    const otra = await db.claseProgramada.findFirst({
      where: { comisionId: clase.comisionId, inicio, id: { not: clase.id } },
      select: { id: true },
    });
    if (fecha < hoy || fecha < inicioPeriodo || fecha > finPeriodo || diasNoLaborables.has(fecha) || otra) {
      await db.claseProgramada.delete({ where: { id: clase.id } });
      continue;
    }
    const aulaId = await aulaDisponiblePara(db, horario.aulaHabitual, inicio, fin, clase.id);
    await db.claseProgramada.update({
      where: { id: clase.id },
      data: { fecha: toDateColumn(fecha), inicio, fin, aulaId },
    });
  }
};
