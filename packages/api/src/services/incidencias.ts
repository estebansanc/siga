import type { AuthContext } from "@repo/auth";
import { prisma, type Prisma } from "@repo/db";
import {
  estadoIncidenciaLabels,
  estadosIncidenciaPorDefecto,
  fotoComprimidaMaxBytes,
  fotoTiposPermitidos,
  puedeAvanzarIncidencia,
  type CambiarEstadoIncidencia,
  type CrearIncidencia,
  type EstadoIncidencia,
  type SubirFotoIncidencia,
} from "@repo/domain";

import { isStorageConfigured } from "../env";
import { conflict, notFound, unprocessable } from "../errors";
import {
  assertStorageConfigured,
  createReadUrl,
  createUploadUrl,
  deleteObjects,
  getObjectInfo,
} from "../integrations/storage";
import type { FotoSubidaDto, IncidenciaDetalleDto, IncidenciaDto } from "../schemas";
import { toIso } from "../serializers";

import { accesoDenegado, assertPerfil } from "./permisos";

const extensionPorTipo: Record<SubirFotoIncidencia["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const prefijoDeFotos = (auth: AuthContext) => `${auth.organizationId}/incidencias/${auth.userId}/`;

const incidenciaInclude = {
  aula: { select: { id: true, codigo: true, edificio: true, piso: true, estado: true } },
  reportadaPor: { select: { id: true, name: true } },
} satisfies Prisma.IncidenciaInclude;

type IncidenciaConDatos = Prisma.IncidenciaGetPayload<{ include: typeof incidenciaInclude }>;

const toIncidenciaDto = (incidencia: IncidenciaConDatos): IncidenciaDto => ({
  id: incidencia.id,
  aula: incidencia.aula,
  elemento: incidencia.elemento,
  descripcion: incidencia.descripcion,
  gravedad: incidencia.gravedad,
  estado: incidencia.estado,
  tieneFoto: incidencia.fotoKey !== null,
  createdAt: toIso(incidencia.createdAt),
  reportadaPor: { id: incidencia.reportadaPor.id, nombre: incidencia.reportadaPor.name },
});

export const listarIncidenciasDeAula = async (
  organizationId: string,
  aulaId: string,
): Promise<IncidenciaDto[]> => {
  const incidencias = await prisma.incidencia.findMany({
    where: { organizationId, aulaId },
    include: incidenciaInclude,
    orderBy: { createdAt: "desc" },
  });
  return incidencias.map(toIncidenciaDto);
};

export const crearUrlFotoIncidencia = async (
  auth: AuthContext,
  input: SubirFotoIncidencia,
): Promise<FotoSubidaDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  assertStorageConfigured();
  const key = `${prefijoDeFotos(auth)}${crypto.randomUUID()}.${extensionPorTipo[input.contentType]}`;
  return { key, uploadUrl: await createUploadUrl(key, input.contentType, input.size) };
};

// El Docente reporta desde una clase suya que tiene esa aula; el Bedel, desde cualquier aula.
const assertPuedeReportar = async (auth: AuthContext, input: CrearIncidencia) => {
  if (auth.perfil === "BEDEL") return;
  const clase = input.claseId
    ? await prisma.claseProgramada.findFirst({
        where: {
          id: input.claseId,
          organizationId: auth.organizationId,
          aulaId: input.aulaId,
          comision: { docentes: { some: { docenteId: auth.userId } } },
        },
        select: { id: true },
      })
    : null;
  if (!clase) throw await accesoDenegado(auth, { requerido: "clase propia con el aula" });
};

const assertFotoSubida = async (auth: AuthContext, fotoKey: string) => {
  assertStorageConfigured();
  if (!fotoKey.startsWith(prefijoDeFotos(auth))) throw unprocessable("La foto no es válida");
  const info = await getObjectInfo(fotoKey);
  if (info === null) throw unprocessable("No se pudo subir la foto. Probá de nuevo.");
  const valida =
    (fotoTiposPermitidos as readonly string[]).includes(info.contentType) &&
    info.size <= fotoComprimidaMaxBytes;
  if (!valida) {
    await deleteObjects([fotoKey]);
    throw unprocessable("La foto debe ser JPG o PNG de hasta 1 MB");
  }
};

export const crearIncidencia = async (
  auth: AuthContext,
  input: CrearIncidencia,
): Promise<IncidenciaDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  const aula = await prisma.aula.findFirst({
    where: { id: input.aulaId, organizationId: auth.organizationId, activa: true },
    select: { id: true },
  });
  if (!aula) throw notFound("Aula");
  await assertPuedeReportar(auth, input);
  if (input.fotoKey) await assertFotoSubida(auth, input.fotoKey);

  const incidencia = await prisma.incidencia.create({
    data: {
      organizationId: auth.organizationId,
      aulaId: aula.id,
      elemento: input.elemento,
      descripcion: input.descripcion,
      gravedad: input.gravedad,
      fotoKey: input.fotoKey ?? null,
      reportadaPorId: auth.userId,
      historial: { create: { estado: "ABIERTA", userId: auth.userId } },
    },
    include: incidenciaInclude,
  });
  return toIncidenciaDto(incidencia);
};

export const listarIncidencias = async (
  auth: AuthContext,
  estados: EstadoIncidencia[],
): Promise<IncidenciaDto[]> => {
  await assertPerfil(auth, "BEDEL");
  const incidencias = await prisma.incidencia.findMany({
    where: {
      organizationId: auth.organizationId,
      estado: { in: estados.length > 0 ? estados : estadosIncidenciaPorDefecto },
    },
    include: incidenciaInclude,
    orderBy: { createdAt: "desc" },
  });
  return incidencias.map(toIncidenciaDto);
};

const buscarIncidencia = async (organizationId: string, id: string) => {
  const incidencia = await prisma.incidencia.findFirst({
    where: { id, organizationId },
    include: {
      ...incidenciaInclude,
      historial: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!incidencia) throw notFound("Incidencia");
  return incidencia;
};

const toDetalleDto = async (
  incidencia: Awaited<ReturnType<typeof buscarIncidencia>>,
): Promise<IncidenciaDetalleDto> => ({
  ...toIncidenciaDto(incidencia),
  fotoUrl:
    incidencia.fotoKey && isStorageConfigured() ? await createReadUrl(incidencia.fotoKey) : null,
  historial: incidencia.historial.map((cambio) => ({
    estado: cambio.estado,
    observaciones: cambio.observaciones,
    createdAt: toIso(cambio.createdAt),
    usuario: { id: cambio.user.id, nombre: cambio.user.name },
  })),
});

export const obtenerIncidencia = async (
  auth: AuthContext,
  id: string,
): Promise<IncidenciaDetalleDto> => {
  await assertPerfil(auth, "BEDEL");
  return toDetalleDto(await buscarIncidencia(auth.organizationId, id));
};

const mensajeTransicionInvalida = (actual: EstadoIncidencia, nuevo: EstadoIncidencia) =>
  actual === "RESUELTA"
    ? "La incidencia ya está resuelta"
    : `No se puede pasar de ${estadoIncidenciaLabels[actual]} a ${estadoIncidenciaLabels[nuevo]}`;

export const cambiarEstadoIncidencia = async (
  auth: AuthContext,
  id: string,
  input: CambiarEstadoIncidencia,
): Promise<IncidenciaDetalleDto> => {
  await assertPerfil(auth, "BEDEL");
  const actual = await buscarIncidencia(auth.organizationId, id);
  if (!puedeAvanzarIncidencia(actual.estado, input.estado)) {
    throw conflict(mensajeTransicionInvalida(actual.estado, input.estado));
  }
  if (input.rehabilitarAula && input.estado !== "RESUELTA") {
    throw unprocessable("El aula se rehabilita al resolver la incidencia");
  }

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.incidencia.updateMany({
      where: { id, estado: actual.estado },
      data: { estado: input.estado },
    });
    if (count === 0)
      throw conflict("La incidencia cambió mientras se resolvía. Actualizá la pantalla.");
    await tx.incidenciaEstado.create({
      data: {
        incidenciaId: id,
        estado: input.estado,
        observaciones: input.observaciones ?? null,
        userId: auth.userId,
      },
    });
    if (input.rehabilitarAula) {
      await tx.aula.update({ where: { id: actual.aulaId }, data: { estado: "DISPONIBLE" } });
    }
  });
  return toDetalleDto(await buscarIncidencia(auth.organizationId, id));
};
