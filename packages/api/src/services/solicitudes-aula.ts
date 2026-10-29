import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, Prisma, toDateColumn, type DbTransaction } from "@repo/db";
import {
  criteriosQueFallan,
  equipamientoSchema,
  esAsignacionInmediata,
  fechaArgentina,
  horaArgentina,
  maxSugerenciasAula,
  type BuscarAulaSolicitud,
  type CrearSolicitudAula,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type {
  AulaSugeridaDto,
  BusquedaAulaDto,
  ClasesDelDiaDto,
  SolicitudAulaDto,
} from "../schemas";
import { toIso, toIsoOrNull } from "../serializers";

import { claseInclude, finalizarClasesVencidas, toClaseDto } from "./clases";
import { assertPerfil, accesoDenegado, esBedel } from "./permisos";
import { registrarAsignacionAula } from "./registro-asignaciones";

export const aulaOcupada = "El aula ya está asignada en esa franja";
const aulaNoDisponible = "El aula no está disponible";
const claseCambiada = "La clase cambió mientras se resolvía. Actualizá la pantalla.";
const pendienteDuplicada = "Esta clase ya tiene una solicitud pendiente.";
export const estadosSinSolicitud = ["VIRTUAL", "SUSPENDIDA", "AUSENTE", "FINALIZADA"] as const;

const aulaSelect = {
  id: true,
  codigo: true,
  edificio: true,
  piso: true,
  capacidad: true,
  equipamiento: true,
} satisfies Prisma.AulaSelect;

const aulaResumenSelect = {
  id: true,
  codigo: true,
  edificio: true,
  piso: true,
} satisfies Prisma.AulaSelect;

export const solicitudInclude = {
  aula: { select: aulaResumenSelect },
  solicitante: { select: { id: true, name: true } },
  clase: {
    select: {
      id: true,
      fecha: true,
      inicio: true,
      fin: true,
      comisionId: true,
      aula: { select: aulaResumenSelect },
      comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.SolicitudAulaInclude;

export type SolicitudConDatos = Prisma.SolicitudAulaGetPayload<{
  include: typeof solicitudInclude;
}>;

export const toSolicitudDto = (solicitud: SolicitudConDatos): SolicitudAulaDto => ({
  id: solicitud.id,
  estado: solicitud.estado,
  alumnos: solicitud.alumnos,
  recursos: equipamientoSchema.array().parse(solicitud.recursos),
  comentario: solicitud.comentario,
  motivoRechazo: solicitud.motivoRechazo,
  createdAt: toIso(solicitud.createdAt),
  resueltaEn: toIsoOrNull(solicitud.resueltaEn),
  solicitante: { id: solicitud.solicitante.id, nombre: solicitud.solicitante.name },
  aula: solicitud.aula,
  clase: {
    id: solicitud.clase.id,
    aula: solicitud.clase.aula,
    fecha: fromDateColumn(solicitud.clase.fecha),
    horaInicio: horaArgentina(solicitud.clase.inicio),
    horaFin: horaArgentina(solicitud.clase.fin),
    materia: solicitud.clase.comision.materia.nombre,
    comision: solicitud.clase.comision.codigo,
  },
});

const clasesSolicitablesWhere = (
  auth: AuthContext,
  ahora: Date,
): Prisma.ClaseProgramadaWhereInput => ({
  organizationId: auth.organizationId,
  estado: { notIn: [...estadosSinSolicitud] },
  fin: { gt: ahora },
  comision: {
    activa: true,
    ...(esBedel(auth) ? {} : { docentes: { some: { docenteId: auth.userId } } }),
  },
});

// Docente: las clases de sus comisiones; Bedel: todas. Solo las que no terminaron ni se
// suspendieron, ausentaron o pasaron a virtual.
export const listarClasesSolicitables = async (
  auth: AuthContext,
  fecha = fechaArgentina(new Date()),
  ahora = new Date(),
): Promise<ClasesDelDiaDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const clases = await prisma.claseProgramada.findMany({
    where: { ...clasesSolicitablesWhere(auth, ahora), fecha: toDateColumn(fecha) },
    include: claseInclude,
    orderBy: [{ inicio: "asc" }, { comision: { materia: { nombre: "asc" } } }],
  });
  return { fecha, clases: clases.map((clase) => toClaseDto(clase)) };
};

const buscarClaseSolicitable = async (auth: AuthContext, claseId: string, ahora: Date) => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: claseId, organizationId: auth.organizationId },
    select: {
      id: true,
      inicio: true,
      fin: true,
      estado: true,
      aulaId: true,
      comision: { select: { docentes: { select: { docenteId: true } } } },
    },
  });
  if (!clase) throw notFound("Clase");
  const esDeSuComision = clase.comision.docentes.some(({ docenteId }) => docenteId === auth.userId);
  if (!esBedel(auth) && !esDeSuComision) {
    throw await accesoDenegado(auth, { claseId, motivo: "clase de otra comisión" });
  }
  const solicitable =
    clase.fin > ahora && !(estadosSinSolicitud as readonly string[]).includes(clase.estado);
  if (!solicitable) throw unprocessable("La clase ya no admite solicitudes de aula");
  return clase;
};

const aulasLibresEnLaFranja = (
  organizationId: string,
  clase: { id: string; inicio: Date; fin: Date },
) =>
  prisma.aula.findMany({
    where: {
      organizationId,
      activa: true,
      estado: "DISPONIBLE",
      clases: {
        none: {
          id: { not: clase.id },
          inicio: { lt: clase.fin },
          fin: { gt: clase.inicio },
          estado: { notIn: [...estadosSinSolicitud] },
        },
      },
    },
    select: aulaSelect,
    orderBy: [{ capacidad: "asc" }, { codigo: "asc" }],
  });

// RF-06: aulas libres que cumplen capacidad y recursos; si ninguna cumple todo, hasta 5 libres
// que cumplen en parte, con el criterio que falla y las que fallan menos primero.
export const buscarAulasParaClase = async (
  auth: AuthContext,
  pedido: BuscarAulaSolicitud,
  ahora = new Date(),
): Promise<BusquedaAulaDto> => {
  const clase = await buscarClaseSolicitable(auth, pedido.claseId, ahora);
  const libres = await aulasLibresEnLaFranja(auth.organizationId, clase);
  const evaluadas = libres.map((aula) => ({ aula, faltantes: criteriosQueFallan(aula, pedido) }));
  const coinciden = evaluadas.filter(({ faltantes }) => faltantes.length === 0);
  const sugerencias: AulaSugeridaDto[] =
    coinciden.length > 0
      ? []
      : evaluadas
          .toSorted((a, b) => a.faltantes.length - b.faltantes.length)
          .slice(0, maxSugerenciasAula)
          .map(({ aula, faltantes }) => ({ ...aula, faltantes }));
  return {
    aulas: coinciden.map(({ aula }) => aula),
    sugerencias,
    hayAulasLibres: libres.length > 0,
  };
};

const assertSinPendiente = async (tx: DbTransaction, claseId: string) => {
  const pendiente = await tx.solicitudAula.findFirst({
    where: { claseId, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (pendiente) throw conflict(pendienteDuplicada);
};

// Serializa las asignaciones del mismo aula: sin el lock, dos pedidos a la vez pasarían ambos
// la verificación de franja libre.
export const bloquearAula = (tx: DbTransaction, aulaId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${aulaId}))`;

// El estado del aula se lee con el lock tomado: así no cambia entre la verificación y la
// asignación. El update condicionado al aula que se leyó evita pisar el cambio de otra
// operación sobre la misma clase. Devuelve el aula para quien necesite su código.
export const asignarAulaALaClase = async (
  tx: DbTransaction,
  organizationId: string,
  clase: { id: string; inicio: Date; fin: Date; aulaId: string | null },
  aulaId: string,
) => {
  await bloquearAula(tx, aulaId);
  const aula = await tx.aula.findFirst({
    where: { id: aulaId, organizationId },
    select: { codigo: true, activa: true, estado: true },
  });
  if (!aula) throw notFound("Aula");
  if (!aula.activa || aula.estado !== "DISPONIBLE") throw unprocessable(aulaNoDisponible);
  const ocupada = await tx.claseProgramada.findFirst({
    where: {
      aulaId,
      id: { not: clase.id },
      inicio: { lt: clase.fin },
      fin: { gt: clase.inicio },
      estado: { notIn: [...estadosSinSolicitud] },
    },
    select: { comision: { select: { codigo: true } } },
  });
  if (ocupada) throw conflict(`${aulaOcupada}: la ocupa la comisión ${ocupada.comision.codigo}`);
  const { count } = await tx.claseProgramada.updateMany({
    where: { id: clase.id, aulaId: clase.aulaId },
    data: { aulaId },
  });
  if (count === 0) throw conflict(claseCambiada);
  return aula;
};

// Pendiente no reserva el aula. Si la clase no tiene aula y empieza en menos de 30 minutos,
// la solicitud nace Asignada y el aula pasa a la clase en la misma transacción.
export const crearSolicitudAula = async (
  auth: AuthContext,
  input: CrearSolicitudAula,
  ahora = new Date(),
): Promise<SolicitudAulaDto> => {
  const clase = await buscarClaseSolicitable(auth, input.claseId, ahora);
  const aula = await prisma.aula.findFirst({
    where: { id: input.aulaId, organizationId: auth.organizationId },
    select: { activa: true, estado: true },
  });
  if (!aula) throw notFound("Aula");
  if (!aula.activa || aula.estado !== "DISPONIBLE") {
    throw unprocessable(aulaNoDisponible);
  }
  const inmediata = clase.aulaId === null && esAsignacionInmediata(clase.inicio, ahora);

  return prisma
    .$transaction(async (tx) => {
      await assertSinPendiente(tx, clase.id);
      if (inmediata) {
        await asignarAulaALaClase(tx, auth.organizationId, clase, input.aulaId);
        await registrarAsignacionAula(tx, {
          organizationId: auth.organizationId,
          claseId: clase.id,
          aulaId: input.aulaId,
          origen: "ASIGNACION_INMEDIATA",
          usuarioId: auth.userId,
        });
      }
      const solicitud = await tx.solicitudAula.create({
        data: {
          organizationId: auth.organizationId,
          solicitanteId: auth.userId,
          claseId: clase.id,
          aulaId: input.aulaId,
          alumnos: input.alumnos,
          recursos: input.recursos,
          comentario: input.comentario ?? null,
          estado: inmediata ? "ASIGNADA" : "PENDIENTE",
        },
        include: solicitudInclude,
      });
      return toSolicitudDto(solicitud);
    })
    .catch((error: unknown) => {
      // El índice único parcial cubre el caso de dos pedidos simultáneos.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict(pendienteDuplicada);
      }
      throw error;
    });
};

export const listarMisSolicitudesAula = async (auth: AuthContext): Promise<SolicitudAulaDto[]> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  const solicitudes = await prisma.solicitudAula.findMany({
    where: { organizationId: auth.organizationId, solicitanteId: auth.userId },
    include: solicitudInclude,
    orderBy: { createdAt: "desc" },
  });
  return solicitudes.map(toSolicitudDto);
};
