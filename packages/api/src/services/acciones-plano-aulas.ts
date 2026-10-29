import type { AuthContext } from "@repo/auth";
import { prisma, toDateColumn, type DbTransaction } from "@repo/db";
import {
  compararCodigosAula,
  compararPisos,
  entraEnCapacidad,
  fechaArgentina,
  rangoDelDia,
  resolucionCorreoDeAula,
  sumarDias,
  type ElegirAula,
  type ReemplazarClase,
} from "@repo/domain";

import { notFound, unprocessable } from "../errors";
import type { AulaDto, ClaseDto, ClasesSinAulaDto, ReemplazoAulaDto } from "../schemas";

import {
  asignarAulaEnTransaccion,
  cambiarAulaDeLaClase,
  entregarResultado,
  leerClaseAsignable,
  type Resultado,
} from "./asignacion-aulas";
import { registrarCambioMasivo } from "./auditoria";
import { claseInclude, finalizarClasesVencidas, toClaseDto } from "./clases";
import { registrarCorreosDeAula } from "./notificaciones-aula";
import { assertPerfil } from "./permisos";
import { estadosSinSolicitud } from "./solicitudes-aula";

const sinClaseEnCurso = "El aula no tiene una clase en curso";
const mismaClase = "La clase que entra no puede ser la que ocupa el aula";
const sinAulaPrevia = "La clase no tiene aula: asignale una";
const mismaAula = "La clase ya tiene esa aula";

const alumnosPorComision = async (comisionIds: string[]) => {
  const grupos = await prisma.comisionSeguida.groupBy({
    by: ["comisionId"],
    where: { comisionId: { in: comisionIds } },
    _count: { _all: true },
  });
  return new Map(grupos.map((grupo) => [grupo.comisionId, grupo._count._all]));
};

const buscarAula = async (organizationId: string, aulaId: string) => {
  const aula = await prisma.aula.findFirst({ where: { id: aulaId, organizationId } });
  if (!aula) throw notFound("Aula");
  return aula;
};

// Asignar: clases de hoy sin aula que admiten asignación, caben en el aula y encuentran
// libre su franja. Un aula que no está Disponible no ofrece ninguna. Al reemplazar, la clase en
// curso del aula se va: su franja no cuenta como ocupada.
export const listarClasesAsignablesAlAula = async (
  auth: AuthContext,
  aulaId: string,
  reemplazo = false,
  ahora = new Date(),
): Promise<ClasesSinAulaDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const aula = await buscarAula(auth.organizationId, aulaId);
  if (!aula.activa || aula.estado !== "DISPONIBLE") return { clases: [] };
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const hoy = fechaArgentina(ahora);
  const [candidatas, ocupadas] = await Promise.all([
    prisma.claseProgramada.findMany({
      where: {
        organizationId: auth.organizationId,
        aulaId: null,
        modalidad: "PRESENCIAL",
        estado: { notIn: [...estadosSinSolicitud] },
        fin: { gt: ahora },
        fecha: toDateColumn(hoy),
        comision: { activa: true },
        solicitudesAula: { none: { estado: "PENDIENTE" } },
      },
      include: claseInclude,
      orderBy: [{ inicio: "asc" }, { comision: { materia: { nombre: "asc" } } }],
    }),
    prisma.claseProgramada.findMany({
      where: {
        aulaId,
        estado: { notIn: [...estadosSinSolicitud] },
        fin: { gt: ahora },
        inicio: reemplazo
          ? { gt: ahora, lt: rangoDelDia(sumarDias(hoy, 1)).desde }
          : { lt: rangoDelDia(sumarDias(hoy, 1)).desde },
      },
      select: { inicio: true, fin: true },
    }),
  ]);
  const alumnos = await alumnosPorComision(candidatas.map((clase) => clase.comisionId));
  const clases = candidatas.filter(
    (clase) =>
      entraEnCapacidad(alumnos.get(clase.comisionId) ?? 0, aula.capacidad) &&
      !ocupadas.some((otra) => otra.inicio < clase.fin && otra.fin > clase.inicio),
  );
  return { clases: clases.map((clase) => toClaseDto(clase, true)) };
};

// Mover: aulas Disponibles, libres en la franja de la clase y con capacidad para ella, sin la
// que ya ocupa, ordenadas por edificio, piso y código para agruparlas por piso.
export const listarAulasDestinoDeClase = async (
  auth: AuthContext,
  claseId: string,
): Promise<AulaDto[]> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: claseId, organizationId: auth.organizationId },
    select: { id: true, aulaId: true, comisionId: true, inicio: true, fin: true },
  });
  if (!clase) throw notFound("Clase");
  const alumnos = (await alumnosPorComision([clase.comisionId])).get(clase.comisionId) ?? 0;
  const aulas = await prisma.aula.findMany({
    where: {
      organizationId: auth.organizationId,
      activa: true,
      estado: "DISPONIBLE",
      capacidad: { gte: alumnos },
      ...(clase.aulaId ? { id: { not: clase.aulaId } } : {}),
      clases: {
        none: {
          id: { not: clase.id },
          inicio: { lt: clase.fin },
          fin: { gt: clase.inicio },
          estado: { notIn: [...estadosSinSolicitud] },
        },
      },
    },
    select: {
      id: true,
      codigo: true,
      edificio: true,
      piso: true,
      capacidad: true,
      equipamiento: true,
    },
  });
  return aulas.sort(
    (a, b) =>
      a.edificio.localeCompare(b.edificio, "es") ||
      compararPisos(a.piso, b.piso) ||
      compararCodigosAula(a.codigo, b.codigo),
  );
};

const codigoDeAula = async (tx: DbTransaction, aulaId: string) =>
  (await tx.aula.findUniqueOrThrow({ where: { id: aulaId }, select: { codigo: true } })).codigo;

type ClaseConAula = Awaited<ReturnType<typeof leerClaseAsignable>> & { aulaId: string };

// Mueve una clase que ya tiene aula a otra: publica el Cambio de aula y avisa a los docentes.
const moverEnTransaccion = async (
  tx: DbTransaction,
  auth: AuthContext,
  clase: ClaseConAula,
  aulaId: string,
  accion: string,
) => {
  if (clase.aulaId === aulaId) throw unprocessable(mismaAula);
  const aulaAnterior = await codigoDeAula(tx, clase.aulaId);
  const { aula, novedad } = await cambiarAulaDeLaClase(tx, auth, clase, aulaId, "CAMBIO_AULA");
  await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", accion, {
    claseId: clase.id,
    aulaId,
    aulaAnteriorId: clase.aulaId,
  });
  const correos = await registrarCorreosDeAula(tx, auth.organizationId, {
    resolucion: resolucionCorreoDeAula(aulaAnterior),
    clase,
    aula: aula.codigo,
    aulaAnterior,
  });
  const actualizada = await tx.claseProgramada.findUniqueOrThrow({
    where: { id: clase.id },
    include: claseInclude,
  });
  return { clase: toClaseDto(actualizada, true), novedad, correos };
};

const conAula = (clase: Awaited<ReturnType<typeof leerClaseAsignable>>): ClaseConAula => {
  if (clase.aulaId === null) throw unprocessable(sinAulaPrevia);
  return { ...clase, aulaId: clase.aulaId };
};

export const moverClaseDeAula = async (
  auth: AuthContext,
  claseId: string,
  { aulaId }: ElegirAula,
  ahora = new Date(),
): Promise<ClaseDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<ClaseDto>> => {
    const clase = conAula(await leerClaseAsignable(tx, auth.organizationId, claseId, ahora));
    const movida = await moverEnTransaccion(tx, auth, clase, aulaId, "aula_movida");
    return { valor: movida.clase, novedad: movida.novedad, correos: movida.correos };
  });
  return entregarResultado(resultado, auth.organizationId);
};

// Todo o nada: la clase en curso del aula pasa al aula de destino y la elegida ocupa el
// aula. Cualquier fallo (aula ocupada, clase que ya no admite asignación) deshace ambas.
export const reemplazarClaseDeAula = async (
  auth: AuthContext,
  aulaId: string,
  { claseId, aulaDestinoId }: ReemplazarClase,
  ahora = new Date(),
): Promise<ReemplazoAulaDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  await buscarAula(auth.organizationId, aulaId);
  const resultado = await prisma.$transaction(async (tx): Promise<Resultado<ReemplazoAulaDto>> => {
    const enCurso = await tx.claseProgramada.findFirst({
      where: {
        aulaId,
        organizationId: auth.organizationId,
        modalidad: "PRESENCIAL",
        estado: { notIn: [...estadosSinSolicitud] },
        inicio: { lte: ahora },
        fin: { gt: ahora },
      },
      select: { id: true },
      orderBy: { inicio: "asc" },
    });
    if (!enCurso) throw unprocessable(sinClaseEnCurso);
    if (enCurso.id === claseId) throw unprocessable(mismaClase);
    const desplazada = conAula(
      await leerClaseAsignable(tx, auth.organizationId, enCurso.id, ahora),
    );
    const movida = await moverEnTransaccion(
      tx,
      auth,
      desplazada,
      aulaDestinoId,
      "clase_desplazada",
    );
    const entrante = await asignarAulaEnTransaccion(tx, auth, claseId, aulaId, ahora);
    await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "clase_reemplazada", {
      claseId,
      desplazadaId: desplazada.id,
      aulaId,
      aulaDestinoId,
    });
    return {
      valor: { clase: entrante.clase, desplazada: movida.clase },
      novedad: movida.novedad,
      correos: [...movida.correos, ...entrante.correos],
    };
  });
  return entregarResultado(resultado, auth.organizationId);
};
