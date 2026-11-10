import type { AuthContext } from "@repo/auth";
import { prisma, type DbTransaction, type Prisma } from "@repo/db";
import { fechaArgentina, rangoDelDia, type CambiarEstadoInstitucional } from "@repo/domain";

import { unprocessable } from "../errors";
import type { CambioEstadoInstitucionalDto, EstadoInstitucionalDto } from "../schemas";
import { toIso, toIsoOrNull } from "../serializers";

import { registrarCambioMasivo } from "./auditoria";
import { assertPerfil } from "./permisos";

const estadoInclude = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.EstadoInstitucionalInclude;

type EstadoConUsuario = Prisma.EstadoInstitucionalGetPayload<{ include: typeof estadoInclude }>;

const toDto = (registro: EstadoConUsuario): EstadoInstitucionalDto => ({
  id: registro.id,
  estado: registro.estado,
  motivo: registro.motivo,
  desde: toIso(registro.desde),
  vigenciaHasta: toIsoOrNull(registro.vigenciaHasta),
  usuario: { id: registro.user.id, nombre: registro.user.name },
});

// Sin registros la institución se asume Abierta desde el inicio del día.
const abiertaPorDefecto = (): EstadoInstitucionalDto => ({
  id: null,
  estado: "ABIERTA",
  motivo: null,
  desde: toIso(rangoDelDia(fechaArgentina(new Date())).desde),
  vigenciaHasta: null,
  usuario: null,
});

// El estado vigente es el último registrado: la tabla solo recibe inserts (DAT-3).
export const obtenerEstadoActual = async (
  organizationId: string,
): Promise<EstadoInstitucionalDto> => {
  const ultimo = await prisma.estadoInstitucional.findFirst({
    where: { organizationId },
    orderBy: { desde: "desc" },
    include: estadoInclude,
  });
  return ultimo ? toDto(ultimo) : abiertaPorDefecto();
};

export const listarHistorial = async (
  organizationId: string,
  limite = 30,
): Promise<EstadoInstitucionalDto[]> => {
  const registros = await prisma.estadoInstitucional.findMany({
    where: { organizationId },
    orderBy: { desde: "desc" },
    take: limite,
    include: estadoInclude,
  });
  return registros.map(toDto);
};

const estadosNoFinales = ["PROGRAMADA", "DEMORADA", "DOCENTE_PRESENTE", "VIRTUAL"] as const;

// RF-01: el cambio se registra con fecha, hora y usuario; al cerrar, las clases de la ventana
// de cierre (hasta la vigencia o el fin del día) pasan a Suspendida en la misma transacción
// (CU-34, FIAB-6). Al reabrir, el bedel puede reanudar las que ese cierre suspendió.
export const cambiarEstado = async (
  auth: AuthContext,
  input: CambiarEstadoInstitucional,
): Promise<CambioEstadoInstitucionalDto> => {
  await assertPerfil(auth, "BEDEL");
  const actual = await obtenerEstadoActual(auth.organizationId);
  if (actual.estado === input.estado) throw unprocessable("Ese ya es el estado actual");

  const desde = new Date();
  const vigenciaHasta = input.vigenciaHasta ? new Date(input.vigenciaHasta) : null;
  if (vigenciaHasta && vigenciaHasta <= desde) {
    throw unprocessable("La vigencia estimada tiene que ser posterior a ahora");
  }
  const cierreAReanudar =
    input.reanudarClases === true && actual.estado === "CERRADA" ? actual.id : null;

  return prisma.$transaction(async (tx) => {
    const registro = await tx.estadoInstitucional.create({
      data: {
        organizationId: auth.organizationId,
        estado: input.estado,
        motivo: input.motivo ?? null,
        desde,
        vigenciaHasta,
        userId: auth.userId,
      },
      include: estadoInclude,
    });
    const clasesSuspendidas =
      input.estado === "CERRADA"
        ? await suspenderClasesDelCierre(tx, registro.id, auth.organizationId, desde, vigenciaHasta)
        : 0;
    const clasesReanudadas = cierreAReanudar
      ? await reanudarClasesDelCierre(tx, cierreAReanudar, auth.organizationId, desde)
      : 0;
    return { estado: toDto(registro), clasesSuspendidas, clasesReanudadas };
  });
};

const suspenderClasesDelCierre = async (
  tx: DbTransaction,
  cierreId: string,
  organizationId: string,
  desde: Date,
  vigenciaHasta: Date | null,
) => {
  const hasta = vigenciaHasta ?? rangoDelDia(fechaArgentina(desde)).hasta;
  const afectadas = await tx.claseProgramada.findMany({
    where: {
      organizationId,
      estado: { in: [...estadosNoFinales] },
      inicio: { lt: hasta },
      fin: { gt: desde },
    },
    select: { id: true, estado: true },
  });
  if (afectadas.length === 0) return 0;
  const claseIds = afectadas.map((clase) => clase.id);
  await tx.claseSuspendidaPorCierre.createMany({
    data: afectadas.map((clase) => ({ cierreId, claseId: clase.id, estadoAnterior: clase.estado })),
  });
  await tx.claseProgramada.updateMany({
    where: { id: { in: claseIds } },
    data: { estado: "SUSPENDIDA" },
  });
  await registrarCambioMasivo(tx, organizationId, "ClaseProgramada", "suspender_por_cierre", {
    claseIds,
    desde: toIso(desde),
    hasta: toIso(hasta),
  });
  return claseIds.length;
};

// Vuelven al estado previo al cierre solo las que siguen suspendidas y no terminaron: las que
// ya pasaron no se dictaron.
const reanudarClasesDelCierre = async (
  tx: DbTransaction,
  cierreId: string,
  organizationId: string,
  ahora: Date,
) => {
  const suspendidas = await tx.claseSuspendidaPorCierre.findMany({
    where: { cierreId, clase: { estado: "SUSPENDIDA", fin: { gt: ahora } } },
    select: { claseId: true, estadoAnterior: true },
  });
  if (suspendidas.length === 0) return 0;
  for (const estado of new Set(suspendidas.map((clase) => clase.estadoAnterior))) {
    await tx.claseProgramada.updateMany({
      where: {
        id: {
          in: suspendidas
            .filter((clase) => clase.estadoAnterior === estado)
            .map((clase) => clase.claseId),
        },
      },
      data: { estado },
    });
  }
  await registrarCambioMasivo(tx, organizationId, "ClaseProgramada", "reanudar_por_reapertura", {
    cierreId,
    clases: suspendidas.map((clase) => ({ id: clase.claseId, estado: clase.estadoAnterior })),
  });
  return suspendidas.length;
};
