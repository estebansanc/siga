import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, type Prisma } from "@repo/db";
import {
  rangoDelDia,
  tamanioPaginaHistorico,
  tipoNovedadSchema,
  type ConsultaNovedades,
  type TipoNovedad,
} from "@repo/domain";

import type { ConsultaNovedadesResultadoDto, OpcionesHistoricoDto } from "../schemas";

import { assertPerfil } from "./permisos";

const filtrosDe = (
  organizationId: string,
  consulta: ConsultaNovedades,
): Prisma.NovedadWhereInput => ({
  organizationId,
  // El rango filtra por la publicación (el evento auditado), días completos en hora argentina.
  createdAt: { gte: rangoDelDia(consulta.desde).desde, lt: rangoDelDia(consulta.hasta).hasta },
  tipo: consulta.tipo,
  comisionId: consulta.comisionId,
  comision: {
    materiaId: consulta.materiaId,
    materia: consulta.carreraId ? { carreraId: consulta.carreraId } : undefined,
    docentes: consulta.docenteId ? { some: { docenteId: consulta.docenteId } } : undefined,
  },
  ...(consulta.aulaId
    ? {
        OR: [
          { aulaNuevaId: consulta.aulaId },
          { clases: { some: { clase: { aulaId: consulta.aulaId } } } },
        ],
      }
    : {}),
});

const novedadInclude = {
  publicadaPor: { select: { name: true } },
  comision: {
    select: {
      codigo: true,
      materia: { select: { nombre: true } },
      docentes: { select: { docente: { select: { name: true } } } },
    },
  },
  clases: { select: { clase: { select: { fecha: true } } } },
} satisfies Prisma.NovedadInclude;

const contarPorTipo = async (where: Prisma.NovedadWhereInput) => {
  const grupos = await prisma.novedad.groupBy({ by: ["tipo"], where, _count: { _all: true } });
  const cantidades = Object.fromEntries(
    tipoNovedadSchema.options.map((tipo) => [tipo, 0]),
  ) as Record<TipoNovedad, number>;
  for (const grupo of grupos) cantidades[grupo.tipo] = grupo._count._all;
  return cantidades;
};

// RF-09 / CA-06: indicadores sobre todo el período filtrado y detalle paginado, la más
// reciente primero. Solo la Autoridad académica.
export const consultarNovedades = async (
  auth: AuthContext,
  consulta: ConsultaNovedades,
): Promise<ConsultaNovedadesResultadoDto> => {
  await assertPerfil(auth, "AUTORIDAD");
  const where = filtrosDe(auth.organizationId, consulta);
  const [porTipo, novedades] = await Promise.all([
    contarPorTipo(where),
    prisma.novedad.findMany({
      where,
      include: novedadInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (consulta.pagina - 1) * tamanioPaginaHistorico,
      take: tamanioPaginaHistorico,
    }),
  ]);
  const total = Object.values(porTipo).reduce((suma, cantidad) => suma + cantidad, 0);

  return {
    total,
    porTipo,
    pagina: consulta.pagina,
    tamanioPagina: tamanioPaginaHistorico,
    totalPaginas: Math.ceil(total / tamanioPaginaHistorico),
    novedades: novedades.map((novedad) => {
      const fechas = novedad.clases.map(({ clase }) => fromDateColumn(clase.fecha)).sort();
      return {
        id: novedad.id,
        publicadaEn: novedad.createdAt.toISOString(),
        tipo: novedad.tipo,
        estado: novedad.estado,
        materia: novedad.comision.materia.nombre,
        comision: novedad.comision.codigo,
        fechaClaseDesde: fechas[0] ?? null,
        fechaClaseHasta: fechas.at(-1) ?? null,
        docentes: novedad.comision.docentes.map(({ docente }) => docente.name),
        publicadaPor: novedad.publicadaPor.name,
        publicadaPorBedelia: novedad.publicadaPorBedelia,
      };
    }),
  };
};

// Docentes que dictan alguna comisión y todas las aulas (también las dadas de baja: pueden
// figurar en el histórico).
export const opcionesHistorico = async (auth: AuthContext): Promise<OpcionesHistoricoDto> => {
  await assertPerfil(auth, "AUTORIDAD");
  const [docentes, aulas] = await Promise.all([
    prisma.user.findMany({
      where: {
        comisionesDictadas: { some: { comision: { organizationId: auth.organizationId } } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.aula.findMany({
      where: { organizationId: auth.organizationId },
      select: { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
  ]);
  return { docentes: docentes.map(({ id, name }) => ({ id, nombre: name })), aulas };
};
