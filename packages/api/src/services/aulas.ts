import { fromDateColumn, prisma, type Prisma } from "@repo/db";
import {
  horaArgentina,
  fechaArgentina,
  rangoDelDia,
  sumarDias,
  type ActualizarAula,
  type CrearAula,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type { AulaClaseDto, AulaDetalleDto, AulaDto, AulaGestionDto } from "../schemas";

const diasProximos = 7;
const estadosSinOcupacion = ["SUSPENDIDA", "AUSENTE", "VIRTUAL", "FINALIZADA"] as const;
const estadosTerminados = ["SUSPENDIDA", "AUSENTE", "FINALIZADA"] as const;

const claseSelect = {
  id: true,
  fecha: true,
  inicio: true,
  fin: true,
  estado: true,
  comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
} satisfies Prisma.ClaseProgramadaSelect;

type ClaseDeAula = Prisma.ClaseProgramadaGetPayload<{ select: typeof claseSelect }>;

const toClaseDto = (clase: ClaseDeAula): AulaClaseDto => ({
  id: clase.id,
  fecha: fromDateColumn(clase.fecha),
  horaInicio: horaArgentina(clase.inicio),
  horaFin: horaArgentina(clase.fin),
  estado: clase.estado,
  materia: clase.comision.materia.nombre,
  comision: clase.comision.codigo,
});

type AulaRegistro = Prisma.AulaGetPayload<object>;

const toGestionDto = (aula: AulaRegistro, ocupada: boolean): AulaGestionDto => ({
  id: aula.id,
  codigo: aula.codigo,
  edificio: aula.edificio,
  piso: aula.piso,
  capacidad: aula.capacidad,
  equipamiento: aula.equipamiento,
  estado: aula.estado,
  observaciones: aula.observaciones,
  activa: aula.activa,
  ocupada,
});

const enCurso = (ahora: Date): Prisma.ClaseProgramadaWhereInput => ({
  modalidad: "PRESENCIAL",
  estado: { notIn: [...estadosSinOcupacion] },
  inicio: { lte: ahora },
  fin: { gt: ahora },
});

const idsOcupadas = async (aulaIds: string[], ahora: Date) => {
  const clases = await prisma.claseProgramada.findMany({
    where: { aulaId: { in: aulaIds }, ...enCurso(ahora) },
    select: { aulaId: true },
  });
  return new Set(clases.map((clase) => clase.aulaId));
};

const buscarAula = async (organizationId: string, id: string) => {
  const aula = await prisma.aula.findFirst({ where: { id, organizationId } });
  if (!aula) throw notFound("Aula");
  return aula;
};

const assertCodigoLibre = async (organizationId: string, codigo: string, excluirId?: string) => {
  const existente = await prisma.aula.findFirst({
    where: { organizationId, codigo, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true },
  });
  if (existente) throw conflict("Ya existe un aula con ese código");
};

export const listarAulasGestion = async (
  organizationId: string,
  bajas: boolean,
  ahora = new Date(),
): Promise<AulaGestionDto[]> => {
  const aulas = await prisma.aula.findMany({
    where: { organizationId, activa: !bajas },
    orderBy: { codigo: "asc" },
  });
  const ocupadas = await idsOcupadas(
    aulas.map((aula) => aula.id),
    ahora,
  );
  return aulas.map((aula) => toGestionDto(aula, ocupadas.has(aula.id)));
};

export const obtenerAula = async (
  organizationId: string,
  id: string,
  ahora = new Date(),
): Promise<AulaDetalleDto> => {
  const aula = await buscarAula(organizationId, id);
  const hoy = fechaArgentina(ahora);
  const orderBy = { inicio: "asc" } as const;
  const [clases, afectadas, ocupadas] = await Promise.all([
    prisma.claseProgramada.findMany({
      where: {
        aulaId: id,
        inicio: {
          gte: rangoDelDia(hoy).desde,
          lt: rangoDelDia(sumarDias(hoy, diasProximos + 1)).desde,
        },
      },
      select: claseSelect,
      orderBy,
    }),
    prisma.claseProgramada.findMany({
      where: { aulaId: id, fin: { gt: ahora }, estado: { notIn: [...estadosTerminados] } },
      select: claseSelect,
      orderBy,
    }),
    idsOcupadas([id], ahora),
  ]);
  return {
    ...toGestionDto(aula, ocupadas.has(id)),
    clases: clases.map(toClaseDto),
    clasesAfectadas: afectadas.map(toClaseDto),
  };
};

export const crearAula = async (
  organizationId: string,
  input: CrearAula,
): Promise<AulaGestionDto> => {
  await assertCodigoLibre(organizationId, input.codigo);
  const aula = await prisma.aula.create({ data: { organizationId, ...input } });
  return toGestionDto(aula, false);
};

export const actualizarAula = async (
  organizationId: string,
  id: string,
  input: ActualizarAula,
): Promise<AulaGestionDto> => {
  const actual = await buscarAula(organizationId, id);
  if (!actual.activa) throw unprocessable("El aula está dada de baja: reactivala para editarla");
  if (input.codigo !== undefined) await assertCodigoLibre(organizationId, input.codigo, id);
  const aula = await prisma.aula.update({ where: { id }, data: input });
  return toGestionDto(aula, (await idsOcupadas([id], new Date())).has(id));
};

const cambiarActiva = async (organizationId: string, id: string, activa: boolean) => {
  const actual = await buscarAula(organizationId, id);
  if (actual.activa === activa) {
    throw conflict(activa ? "El aula ya está activa" : "El aula ya está dada de baja");
  }
  const aula = await prisma.aula.update({ where: { id }, data: { activa } });
  return toGestionDto(aula, false);
};

export const darDeBajaAula = (organizationId: string, id: string) =>
  cambiarActiva(organizationId, id, false);

export const reactivarAula = (organizationId: string, id: string) =>
  cambiarActiva(organizationId, id, true);

// CU-17 reducido al Cambio de aula: aulas activas y disponibles sin otra clase en la franja
// de cada clase elegida, de menor a mayor capacidad.
export const listarAulasDisponibles = async (
  organizationId: string,
  claseIds: string[],
): Promise<AulaDto[]> => {
  const clases = await prisma.claseProgramada.findMany({
    where: { id: { in: claseIds }, organizationId },
    select: { id: true, inicio: true, fin: true },
  });
  if (clases.length !== new Set(claseIds).size) throw notFound("Clase");
  const aulas = await prisma.aula.findMany({
    where: {
      organizationId,
      activa: true,
      estado: "DISPONIBLE",
      clases: {
        none: {
          id: { notIn: claseIds },
          OR: clases.map((clase) => ({ inicio: { lt: clase.fin }, fin: { gt: clase.inicio } })),
        },
      },
    },
    orderBy: [{ capacidad: "asc" }, { codigo: "asc" }],
    select: {
      id: true,
      codigo: true,
      edificio: true,
      piso: true,
      capacidad: true,
      equipamiento: true,
    },
  });
  return aulas;
};
