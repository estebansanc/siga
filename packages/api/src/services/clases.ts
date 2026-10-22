import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, toDateColumn, type Prisma } from "@repo/db";
import { fechaArgentina, horaArgentina, type ListarClasesQuery } from "@repo/domain";

import { notFound } from "../errors";
import type { AsistenciaDto, ClaseDto, ClaseNovedadDto, ClasesDelDiaDto } from "../schemas";
import { toIso } from "../serializers";

import { registrarCambioMasivo } from "./auditoria";

export const estadosClaseEnCurso = [
  "PROGRAMADA",
  "DEMORADA",
  "DOCENTE_PRESENTE",
  "VIRTUAL",
] as const;

const aulaSelect = {
  id: true,
  codigo: true,
  edificio: true,
  piso: true,
} satisfies Prisma.AulaSelect;

const novedadInclude = {
  novedad: { include: { aulaNueva: { select: aulaSelect } } },
} satisfies Prisma.NovedadClaseInclude;

export const asistenciaInclude = {
  docente: { select: { id: true, name: true } },
  registradaPor: { select: { id: true, name: true } },
} satisfies Prisma.AsistenciaDocenteInclude;

export const claseInclude = {
  comision: {
    include: {
      materia: { include: { carrera: true } },
      docentes: { include: { docente: { select: { id: true, name: true } } } },
    },
  },
  aula: { select: aulaSelect },
  asistencia: { include: asistenciaInclude },
  novedades: {
    where: { novedad: { estado: "ACTIVA" } },
    include: novedadInclude,
    orderBy: { novedad: { createdAt: "desc" } },
  },
} satisfies Prisma.ClaseProgramadaInclude;

type ClaseConDatos = Prisma.ClaseProgramadaGetPayload<{ include: typeof claseInclude }>;
type NovedadDeClase = ClaseConDatos["novedades"][number]["novedad"];

export const toClaseNovedadDto = (novedad: NovedadDeClase): ClaseNovedadDto => ({
  id: novedad.id,
  tipo: novedad.tipo,
  estado: novedad.estado,
  minutosDemora: novedad.minutosDemora,
  enlaceVirtual: novedad.enlaceVirtual,
  aulaNueva: novedad.aulaNueva,
  mensaje: novedad.mensaje,
  publicadaPorBedelia: novedad.publicadaPorBedelia,
  createdAt: toIso(novedad.createdAt),
});

export const toAsistenciaDto = (
  asistencia: NonNullable<ClaseConDatos["asistencia"]>,
): AsistenciaDto => ({
  id: asistencia.id,
  metodo: asistencia.metodo,
  horaLlegada: horaArgentina(asistencia.horaLlegada),
  llegadaEn: toIso(asistencia.horaLlegada),
  motivo: asistencia.motivo,
  docente: { id: asistencia.docente.id, nombre: asistencia.docente.name },
  registradaPor: { id: asistencia.registradaPor.id, nombre: asistencia.registradaPor.name },
});

// RF-09: método, hora, responsable y motivo son para Bedel y Autoridad.
const puedeVerAsistencia = (auth: AuthContext) =>
  auth.perfil === "BEDEL" || auth.perfil === "AUTORIDAD";

export const toClaseDto = (clase: ClaseConDatos, verAsistencia = false): ClaseDto => ({
  id: clase.id,
  fecha: fromDateColumn(clase.fecha),
  horaInicio: horaArgentina(clase.inicio),
  horaFin: horaArgentina(clase.fin),
  inicio: toIso(clase.inicio),
  fin: toIso(clase.fin),
  estado: clase.estado,
  modalidad: clase.modalidad,
  comision: { id: clase.comision.id, codigo: clase.comision.codigo, turno: clase.comision.turno },
  materia: {
    id: clase.comision.materia.id,
    codigo: clase.comision.materia.codigo,
    nombre: clase.comision.materia.nombre,
    anioCarrera: clase.comision.materia.anioCarrera,
    carreraId: clase.comision.materia.carreraId,
  },
  carrera: {
    id: clase.comision.materia.carrera.id,
    codigo: clase.comision.materia.carrera.codigo,
    nombre: clase.comision.materia.carrera.nombre,
  },
  aula: clase.aula,
  docentes: clase.comision.docentes.map(({ docente }) => ({
    id: docente.id,
    nombre: docente.name,
  })),
  novedades: clase.novedades.map(({ novedad }) => toClaseNovedadDto(novedad)),
  asistencia: verAsistencia && clase.asistencia ? toAsistenciaDto(clase.asistencia) : null,
});

// Finalización perezosa (sin cron): al consultar, toda clase cuya franja terminó pasa a
// Finalizada. Una clase que seguía Programada queda así "sin registro" para el histórico.
export const finalizarClasesVencidas = async (organizationId: string, ahora = new Date()) => {
  const vencidas = await prisma.claseProgramada.findMany({
    where: { organizationId, estado: { in: [...estadosClaseEnCurso] }, fin: { lt: ahora } },
    select: { id: true },
  });
  if (vencidas.length === 0) return 0;
  const claseIds = vencidas.map((clase) => clase.id);
  await prisma.$transaction(async (tx) => {
    await tx.claseProgramada.updateMany({
      where: { id: { in: claseIds } },
      data: { estado: "FINALIZADA" },
    });
    await registrarCambioMasivo(tx, organizationId, "ClaseProgramada", "finalizar_por_horario", {
      claseIds,
    });
  });
  return claseIds.length;
};

// "mias": lo que el perfil tiene a cargo; bedel y autoridad siempre ven todo.
const ambitoWhere = (auth: AuthContext, ambito: ListarClasesQuery["ambito"]) => {
  if (ambito === "todas") return {};
  if (auth.perfil === "ESTUDIANTE") return { seguidores: { some: { userId: auth.userId } } };
  if (auth.perfil === "DOCENTE") return { docentes: { some: { docenteId: auth.userId } } };
  return {};
};

// RF-07: las clases de un día con filtros combinables; por defecto hoy y las propias.
export const listarClases = async (
  auth: AuthContext,
  query: ListarClasesQuery,
): Promise<ClasesDelDiaDto> => {
  const fecha = query.fecha ?? fechaArgentina(new Date());
  await finalizarClasesVencidas(auth.organizationId);
  const clases = await prisma.claseProgramada.findMany({
    where: {
      organizationId: auth.organizationId,
      fecha: toDateColumn(fecha),
      comisionId: query.comisionId,
      comision: {
        activa: true,
        materiaId: query.materiaId,
        materia: { carreraId: query.carreraId, anioCarrera: query.anio },
        ...ambitoWhere(auth, query.ambito),
      },
    },
    include: claseInclude,
    orderBy: [{ inicio: "asc" }, { comision: { materia: { nombre: "asc" } } }],
  });
  return { fecha, clases: clases.map((clase) => toClaseDto(clase, puedeVerAsistencia(auth))) };
};

// Detalle con el historial de novedades del día, finalizadas incluidas.
export const obtenerClase = async (auth: AuthContext, claseId: string): Promise<ClaseDto> => {
  await finalizarClasesVencidas(auth.organizationId);
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: claseId, organizationId: auth.organizationId },
    include: {
      ...claseInclude,
      novedades: { include: novedadInclude, orderBy: { novedad: { createdAt: "desc" } } },
    },
  });
  if (!clase) throw notFound("Clase");
  return toClaseDto(clase, puedeVerAsistencia(auth));
};
