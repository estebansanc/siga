import type { AuthContext } from "@repo/auth";
import { prisma, toDateColumn, type DbTransaction, type EmailOutbox } from "@repo/db";
import {
  diasClasesSinAula,
  fechaArgentina,
  sumarDias,
  type ElegirAula,
  type EstadoSolicitudAula,
  type OrigenAsignacionAula,
  type RechazarSolicitudAula,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type { ClaseDto, ClasesSinAulaDto, NovedadDto, SolicitudAulaDto } from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { claseInclude, finalizarClasesVencidas, toClaseDto } from "./clases";
import { notificarNovedadPublicada } from "./notificaciones";
import { entregarCorreosDeAula, registrarCorreosDeAula } from "./notificaciones-aula";
import { crearNovedadCambioAula } from "./novedades";
import { assertPerfil } from "./permisos";
import { registrarAsignacionAula } from "./registro-asignaciones";
import {
  asignarAulaALaClase,
  estadosSinSolicitud,
  solicitudInclude,
  toSolicitudDto,
} from "./solicitudes-aula";

const claseSinAsignacion = "La clase ya no admite asignación de aula";
const solicitudNoPendiente = "La solicitud ya no está pendiente";
const solicitudNoAsignada = "La solicitud no está asignada";
const claseConAula = "La clase ya tiene aula asignada";
const claseConPendiente = "La clase tiene una solicitud pendiente: resolvela antes de asignar aula";

type Resultado<T> = { valor: T; novedad: NovedadDto | null; correos: EmailOutbox[] };

const entregarResultado = async <T>({ valor, novedad, correos }: Resultado<T>, orgId: string) => {
  if (novedad) await notificarNovedadPublicada(orgId, novedad);
  await entregarCorreosDeAula(correos);
  return valor;
};

export const listarSolicitudesAulaPorEstado = async (
  auth: AuthContext,
  estado: EstadoSolicitudAula,
): Promise<SolicitudAulaDto[]> => {
  await assertPerfil(auth, "BEDEL");
  const abiertas = estado === "PENDIENTE" || estado === "ASIGNADA";
  const solicitudes = await prisma.solicitudAula.findMany({
    where: { organizationId: auth.organizationId, estado },
    include: solicitudInclude,
    orderBy: abiertas ? { clase: { inicio: "asc" } } : { resueltaEn: "desc" },
  });
  return solicitudes.map(toSolicitudDto);
};

export const listarClasesSinAula = async (
  auth: AuthContext,
  ahora = new Date(),
): Promise<ClasesSinAulaDto> => {
  await assertPerfil(auth, "BEDEL");
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const hoy = fechaArgentina(ahora);
  const clases = await prisma.claseProgramada.findMany({
    where: {
      organizationId: auth.organizationId,
      aulaId: null,
      modalidad: "PRESENCIAL",
      estado: { notIn: [...estadosSinSolicitud] },
      fin: { gt: ahora },
      fecha: { gte: toDateColumn(hoy), lte: toDateColumn(sumarDias(hoy, diasClasesSinAula)) },
      comision: { activa: true },
    },
    include: claseInclude,
    orderBy: [{ inicio: "asc" }, { comision: { materia: { nombre: "asc" } } }],
  });
  return { clases: clases.map((clase) => toClaseDto(clase, true)) };
};

const leerClaseAsignable = async (
  tx: DbTransaction,
  organizationId: string,
  claseId: string,
  ahora: Date,
) => {
  const clase = await tx.claseProgramada.findFirst({
    where: { id: claseId, organizationId },
    select: {
      id: true,
      fecha: true,
      inicio: true,
      fin: true,
      aulaId: true,
      estado: true,
      modalidad: true,
      comisionId: true,
      comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
    },
  });
  if (!clase) throw notFound("Clase");
  const asignable =
    clase.fin > ahora &&
    clase.modalidad !== "VIRTUAL" &&
    !(estadosSinSolicitud as readonly string[]).includes(clase.estado);
  if (!asignable) throw unprocessable(claseSinAsignacion);
  return clase;
};

type ClaseAsignable = Awaited<ReturnType<typeof leerClaseAsignable>>;

// Mueve la clase al aula (verificando en la misma transacción que siga libre) y, si ya tenía
// otra, publica el Cambio de aula que ven los estudiantes.
const cambiarAulaDeLaClase = async (
  tx: DbTransaction,
  auth: AuthContext,
  clase: ClaseAsignable,
  aulaId: string,
  origen: OrigenAsignacionAula,
) => {
  const aula = await asignarAulaALaClase(tx, auth.organizationId, clase, aulaId);
  if (clase.aulaId === aulaId) return { aula, novedad: null };
  await registrarAsignacionAula(tx, {
    organizationId: auth.organizationId,
    claseId: clase.id,
    aulaId,
    origen,
    usuarioId: auth.userId,
  });
  if (!clase.aulaId) return { aula, novedad: null };
  const novedad = await crearNovedadCambioAula(tx, {
    organizationId: auth.organizationId,
    publicadaPorId: auth.userId,
    comisionId: clase.comisionId,
    claseId: clase.id,
    aulaAnteriorId: clase.aulaId,
    aulaNuevaId: aulaId,
  });
  return { aula, novedad };
};

const codigoDeAula = async (tx: DbTransaction, aulaId: string | null) =>
  aulaId ? (await tx.aula.findUniqueOrThrow({ where: { id: aulaId } })).codigo : null;

export const aprobarSolicitudAula = async (
  auth: AuthContext,
  solicitudId: string,
  { aulaId }: ElegirAula,
  ahora = new Date(),
): Promise<SolicitudAulaDto> => {
  await assertPerfil(auth, "BEDEL");
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<SolicitudAulaDto>> => {
    const { count } = await tx.solicitudAula.updateMany({
      where: { id: solicitudId, organizationId: auth.organizationId, estado: "PENDIENTE" },
      data: { estado: "APROBADA", aulaId, resueltaPorId: auth.userId, resueltaEn: ahora },
    });
    if (count === 0) throw await solicitudNoResoluble(tx, auth, solicitudId, solicitudNoPendiente);
    const solicitud = await tx.solicitudAula.findUniqueOrThrow({
      where: { id: solicitudId },
      include: solicitudInclude,
    });
    const clase = await leerClaseAsignable(tx, auth.organizationId, solicitud.claseId, ahora);
    const { aula, novedad } = await cambiarAulaDeLaClase(
      tx,
      auth,
      clase,
      aulaId,
      "SOLICITUD_APROBADA",
    );
    await registrarCambioMasivo(tx, auth.organizationId, "SolicitudAula", "solicitud_aprobada", {
      solicitudId,
      claseId: clase.id,
      aulaId,
      aulaAnteriorId: clase.aulaId,
    });
    const correos = await registrarCorreosDeAula(tx, auth.organizationId, {
      resolucion: "APROBADA",
      clase,
      aula: aula.codigo,
    });
    const actualizada = await tx.solicitudAula.findUniqueOrThrow({
      where: { id: solicitudId },
      include: solicitudInclude,
    });
    return { valor: toSolicitudDto(actualizada), novedad, correos };
  });
  return entregarResultado(resultado, auth.organizationId);
};

export const rechazarSolicitudAula = async (
  auth: AuthContext,
  solicitudId: string,
  { motivo }: RechazarSolicitudAula,
  ahora = new Date(),
): Promise<SolicitudAulaDto> => {
  await assertPerfil(auth, "BEDEL");
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<SolicitudAulaDto>> => {
    const { count } = await tx.solicitudAula.updateMany({
      where: { id: solicitudId, organizationId: auth.organizationId, estado: "PENDIENTE" },
      data: {
        estado: "RECHAZADA",
        motivoRechazo: motivo,
        resueltaPorId: auth.userId,
        resueltaEn: ahora,
      },
    });
    if (count === 0) throw await solicitudNoResoluble(tx, auth, solicitudId, solicitudNoPendiente);
    const solicitud = await tx.solicitudAula.findUniqueOrThrow({
      where: { id: solicitudId },
      include: solicitudInclude,
    });
    const clase = await tx.claseProgramada.findUniqueOrThrow({
      where: { id: solicitud.claseId },
      select: {
        id: true,
        fecha: true,
        inicio: true,
        fin: true,
        comisionId: true,
        comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
      },
    });
    await registrarCambioMasivo(tx, auth.organizationId, "SolicitudAula", "solicitud_rechazada", {
      solicitudId,
      claseId: clase.id,
      aulaId: solicitud.aulaId,
      motivo,
    });
    const correos = await registrarCorreosDeAula(tx, auth.organizationId, {
      resolucion: "RECHAZADA",
      clase,
      aula: solicitud.aula.codigo,
      motivo,
    });
    return { valor: toSolicitudDto(solicitud), novedad: null, correos };
  });
  return entregarResultado(resultado, auth.organizationId);
};

export const reasignarSolicitudAula = async (
  auth: AuthContext,
  solicitudId: string,
  { aulaId }: ElegirAula,
  ahora = new Date(),
): Promise<SolicitudAulaDto> => {
  await assertPerfil(auth, "BEDEL");
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<SolicitudAulaDto>> => {
    const previa = await tx.solicitudAula.findFirst({
      where: { id: solicitudId, organizationId: auth.organizationId },
      select: { estado: true, claseId: true },
    });
    if (!previa) throw notFound("Solicitud");
    if (previa.estado !== "ASIGNADA") throw conflict(solicitudNoAsignada);
    const clase = await leerClaseAsignable(tx, auth.organizationId, previa.claseId, ahora);
    if (clase.aulaId === aulaId) throw unprocessable("La clase ya tiene esa aula");
    const aulaAnterior = await codigoDeAula(tx, clase.aulaId);
    const { aula, novedad } = await cambiarAulaDeLaClase(tx, auth, clase, aulaId, "CAMBIO_AULA");
    const solicitud = await tx.solicitudAula.update({
      where: { id: solicitudId },
      data: { aulaId, resueltaPorId: auth.userId, resueltaEn: ahora },
      include: solicitudInclude,
    });
    await registrarCambioMasivo(tx, auth.organizationId, "SolicitudAula", "solicitud_reasignada", {
      solicitudId,
      claseId: clase.id,
      aulaId,
      aulaAnteriorId: clase.aulaId,
    });
    const correos = await registrarCorreosDeAula(tx, auth.organizationId, {
      resolucion: "REASIGNADA",
      clase,
      aula: aula.codigo,
      aulaAnterior,
    });
    return { valor: toSolicitudDto(solicitud), novedad, correos };
  });
  return entregarResultado(resultado, auth.organizationId);
};

export const asignarAulaAClaseSinAula = async (
  auth: AuthContext,
  claseId: string,
  { aulaId }: ElegirAula,
  ahora = new Date(),
): Promise<ClaseDto> => {
  await assertPerfil(auth, "BEDEL");
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<ClaseDto>> => {
    const clase = await leerClaseAsignable(tx, auth.organizationId, claseId, ahora);
    if (clase.aulaId !== null) throw conflict(claseConAula);
    const pendiente = await tx.solicitudAula.findFirst({
      where: { claseId, estado: "PENDIENTE" },
      select: { id: true },
    });
    if (pendiente) throw conflict(claseConPendiente);
    const aula = await asignarAulaALaClase(tx, auth.organizationId, clase, aulaId);
    await registrarAsignacionAula(tx, {
      organizationId: auth.organizationId,
      claseId,
      aulaId,
      origen: "ASIGNACION_BEDELIA",
      usuarioId: auth.userId,
    });
    await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "aula_asignada", {
      claseId,
      aulaId,
    });
    const correos = await registrarCorreosDeAula(tx, auth.organizationId, {
      resolucion: "ASIGNADA",
      clase,
      aula: aula.codigo,
    });
    const actualizada = await tx.claseProgramada.findUniqueOrThrow({
      where: { id: claseId },
      include: claseInclude,
    });
    return { valor: toClaseDto(actualizada, true), novedad: null, correos };
  });
  return entregarResultado(resultado, auth.organizationId);
};

const solicitudNoResoluble = async (
  tx: DbTransaction,
  auth: AuthContext,
  solicitudId: string,
  mensaje: string,
) => {
  const existe = await tx.solicitudAula.findFirst({
    where: { id: solicitudId, organizationId: auth.organizationId },
    select: { id: true },
  });
  return existe ? conflict(mensaje) : notFound("Solicitud");
};
