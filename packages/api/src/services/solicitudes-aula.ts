import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, toDateColumn, type DbTransaction, type Prisma } from "@repo/db";
import {
  criteriosQueFallan,
  esAsignacionInmediata,
  fechaArgentina,
  horaArgentina,
  maxSugerenciasAula,
  type BuscarAulaSolicitud,
  type Equipamiento,
  type CrearSolicitudAula,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type {
  AulaSugeridaDto,
  BusquedaAulaDto,
  ClasesDelDiaDto,
  SolicitudAulaDto,
} from "../schemas";
import { toIso } from "../serializers";

import { claseInclude, finalizarClasesVencidas, toClaseDto } from "./clases";
import { assertPerfil, accesoDenegado, esBedel } from "./permisos";

const aulaOcupada = "El aula ya está asignada en esa franja";
const pendienteDuplicada = "Esta clase ya tiene una solicitud pendiente.";
const estadosSinSolicitud = ["VIRTUAL", "SUSPENDIDA", "AUSENTE", "FINALIZADA"] as const;

const aulaSelect = {
  id: true,
  codigo: true,
  edificio: true,
  piso: true,
  capacidad: true,
  equipamiento: true,
} satisfies Prisma.AulaSelect;

const solicitudInclude = {
  aula: { select: { id: true, codigo: true, edificio: true, piso: true } },
  clase: {
    select: {
      id: true,
      fecha: true,
      inicio: true,
      fin: true,
      comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.SolicitudAulaInclude;

type SolicitudConDatos = Prisma.SolicitudAulaGetPayload<{ include: typeof solicitudInclude }>;

const toSolicitudDto = (solicitud: SolicitudConDatos): SolicitudAulaDto => ({
  id: solicitud.id,
  estado: solicitud.estado,
  alumnos: solicitud.alumnos,
  recursos: solicitud.recursos as Equipamiento[],
  comentario: solicitud.comentario,
  motivoRechazo: solicitud.motivoRechazo,
  createdAt: toIso(solicitud.createdAt),
  aula: solicitud.aula,
  clase: {
    id: solicitud.clase.id,
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
const asignarAulaALaClase = async (
  tx: DbTransaction,
  clase: { id: string; inicio: Date; fin: Date },
  aulaId: string,
) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${aulaId}))`;
  const ocupada = await tx.claseProgramada.findFirst({
    where: {
      aulaId,
      id: { not: clase.id },
      inicio: { lt: clase.fin },
      fin: { gt: clase.inicio },
      estado: { notIn: [...estadosSinSolicitud] },
    },
    select: { id: true },
  });
  if (ocupada) throw conflict(aulaOcupada);
  await tx.claseProgramada.update({ where: { id: clase.id }, data: { aulaId } });
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
    throw unprocessable("El aula no está disponible");
  }
  const inmediata = clase.aulaId === null && esAsignacionInmediata(clase.inicio, ahora);

  return prisma
    .$transaction(async (tx) => {
      await assertSinPendiente(tx, clase.id);
      if (inmediata) await asignarAulaALaClase(tx, clase, input.aulaId);
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
      if ((error as { code?: string }).code === "P2002") throw conflict(pendienteDuplicada);
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
