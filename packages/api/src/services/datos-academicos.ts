import type { AuthContext } from "@repo/auth";
import { generarClasesProgramadas, prisma, type Prisma } from "@repo/db";
import type { BuscarComisionesQuery } from "@repo/domain";

import type { CarreraDto, ComisionDto, GeneracionClasesDto, MateriaDto } from "../schemas";

import { assertPerfil } from "./permisos";

export const listarCarreras = async (organizationId: string): Promise<CarreraDto[]> =>
  prisma.carrera.findMany({
    where: { organizationId, activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, codigo: true, nombre: true },
  });

export const listarMaterias = async (
  organizationId: string,
  filtro: { carreraId?: string; anio?: number },
): Promise<MateriaDto[]> =>
  prisma.materia.findMany({
    where: { organizationId, activa: true, carreraId: filtro.carreraId, anioCarrera: filtro.anio },
    orderBy: [{ anioCarrera: "asc" }, { nombre: "asc" }],
    select: { id: true, codigo: true, nombre: true, anioCarrera: true, carreraId: true },
  });

export const comisionInclude = {
  materia: { include: { carrera: true } },
  docentes: { include: { docente: { select: { id: true, name: true } } } },
} satisfies Prisma.ComisionInclude;

type ComisionConDatos = Prisma.ComisionGetPayload<{ include: typeof comisionInclude }>;

export const toComisionDto = (comision: ComisionConDatos): ComisionDto => ({
  id: comision.id,
  codigo: comision.codigo,
  turno: comision.turno,
  anioLectivo: comision.anioLectivo,
  materia: {
    id: comision.materia.id,
    codigo: comision.materia.codigo,
    nombre: comision.materia.nombre,
    anioCarrera: comision.materia.anioCarrera,
    carreraId: comision.materia.carreraId,
  },
  carrera: {
    id: comision.materia.carrera.id,
    codigo: comision.materia.carrera.codigo,
    nombre: comision.materia.carrera.nombre,
  },
  docentes: comision.docentes.map(({ docente }) => ({ id: docente.id, nombre: docente.name })),
});

export const buscarComisiones = async (
  organizationId: string,
  query: BuscarComisionesQuery,
): Promise<ComisionDto[]> => {
  const comisiones = await prisma.comision.findMany({
    where: {
      organizationId,
      activa: true,
      materiaId: query.materiaId,
      materia: { activa: true, carreraId: query.carreraId, anioCarrera: query.anio },
    },
    include: comisionInclude,
    orderBy: [
      { materia: { anioCarrera: "asc" } },
      { materia: { nombre: "asc" } },
      { codigo: "asc" },
    ],
  });
  return comisiones.map(toComisionDto);
};

// RF-13: genera las clases del período (o de una comisión) a partir de los horarios.
export const generarClases = async (
  auth: AuthContext,
  filtro: { periodoLectivoId?: string; comisionId?: string },
): Promise<GeneracionClasesDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  return generarClasesProgramadas(prisma, auth.organizationId, filtro);
};
