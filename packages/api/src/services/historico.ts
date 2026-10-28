import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, toDateColumn, type Prisma } from "@repo/db";
import {
  calcularIndicadoresAsistencia,
  rangoDelDia,
  tamanioPaginaHistorico,
  tipoNovedadSchema,
  type ConsultaAsistencias,
  type ConsultaNovedades,
  type TipoNovedad,
} from "@repo/domain";

import type {
  ConsultaAsistenciasResultadoDto,
  ConsultaNovedadesResultadoDto,
  OpcionesHistoricoDto,
} from "../schemas";

import { finalizarClasesVencidas } from "./clases";
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
  await assertPerfil(auth, "AUTORIDAD", "BEDEL");
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

// El rango filtra por la fecha de la clase (mide clases dictadas). El docente es el de la
// asistencia o, si la clase no tiene registro, alguno de los de la comisión.
const clasesDelPeriodo = (
  organizationId: string,
  consulta: ConsultaAsistencias,
): Prisma.ClaseProgramadaWhereInput => ({
  organizationId,
  fecha: { gte: toDateColumn(consulta.desde), lte: toDateColumn(consulta.hasta) },
  aulaId: consulta.aulaId,
  comisionId: consulta.comisionId,
  comision: {
    materiaId: consulta.materiaId,
    materia: consulta.carreraId ? { carreraId: consulta.carreraId } : undefined,
  },
  ...(consulta.docenteId
    ? {
        OR: [
          { asistencia: { docenteId: consulta.docenteId } },
          {
            asistencia: null,
            comision: { docentes: { some: { docenteId: consulta.docenteId } } },
          },
        ],
      }
    : {}),
});

// Base de la asistencia: presenciales ya terminadas. Las Suspendidas y Virtuales no admiten
// asistencia presencial; una Ausente cuenta sin asistencia porque fue avisada.
const clasesBase = (
  periodo: Prisma.ClaseProgramadaWhereInput,
  ahora: Date,
): Prisma.ClaseProgramadaWhereInput => ({
  AND: [
    periodo,
    { modalidad: "PRESENCIAL", estado: { in: ["FINALIZADA", "AUSENTE"] }, fin: { lt: ahora } },
  ],
});

const asistenciaInclude = {
  docente: { select: { name: true } },
  registradaPor: { select: { name: true } },
  clase: {
    select: {
      aula: { select: { codigo: true } },
      comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.AsistenciaDocenteInclude;

// RF-09 / RF-18 / EF-5: historial de asistencia docente para la Autoridad y, como historial
// operativo, para el Bedel.
export const consultarAsistencias = async (
  auth: AuthContext,
  consulta: ConsultaAsistencias,
  ahora = new Date(),
): Promise<ConsultaAsistenciasResultadoDto> => {
  await assertPerfil(auth, "AUTORIDAD", "BEDEL");
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const periodo = clasesDelPeriodo(auth.organizationId, consulta);
  const base = clasesBase(periodo, ahora);
  const registros = { clase: periodo };

  const [
    clasesBaseTotal,
    clasesConAsistencia,
    clasesSinRegistro,
    registrosQr,
    registrosManuales,
    detalle,
  ] = await Promise.all([
    prisma.claseProgramada.count({ where: base }),
    prisma.claseProgramada.count({ where: { AND: [base, { asistencia: { isNot: null } }] } }),
    prisma.claseProgramada.count({
      where: { AND: [base, { estado: "FINALIZADA", asistencia: null }] },
    }),
    prisma.asistenciaDocente.count({ where: { ...registros, metodo: "QR" } }),
    prisma.asistenciaDocente.count({ where: { ...registros, metodo: "MANUAL" } }),
    prisma.asistenciaDocente.findMany({
      where: registros,
      include: asistenciaInclude,
      orderBy: [{ horaLlegada: "desc" }, { id: "desc" }],
      skip: (consulta.pagina - 1) * tamanioPaginaHistorico,
      take: tamanioPaginaHistorico,
    }),
  ]);
  const total = registrosQr + registrosManuales;

  return {
    indicadores: calcularIndicadoresAsistencia({
      clasesBase: clasesBaseTotal,
      clasesConAsistencia,
      clasesSinRegistro,
      registrosQr,
      registrosManuales,
    }),
    total,
    pagina: consulta.pagina,
    tamanioPagina: tamanioPaginaHistorico,
    totalPaginas: Math.ceil(total / tamanioPaginaHistorico),
    registros: detalle.map((asistencia) => ({
      id: asistencia.id,
      registradaEn: asistencia.horaLlegada.toISOString(),
      docente: asistencia.docente.name,
      materia: asistencia.clase.comision.materia.nombre,
      comision: asistencia.clase.comision.codigo,
      aula: asistencia.clase.aula?.codigo ?? null,
      metodo: asistencia.metodo,
      registradaPor: asistencia.registradaPor.name,
      registradaPorBedelia: asistencia.metodo === "MANUAL",
    })),
  };
};
