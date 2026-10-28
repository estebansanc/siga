import { prisma } from "@repo/db";
import {
  estadoVigente,
  estaBloqueada,
  institutionSlug,
  mensajeCuentaBloqueada,
  registrarIntentoFallido,
  sinBloqueo,
  type EstadoBloqueo,
} from "@repo/domain";
import { APIError } from "better-auth/api";

export const lockedAccountCode = "ACCOUNT_LOCKED";

type AuditoriaIngreso = "ingreso_exitoso" | "ingreso_fallido" | "bloqueo";

const normalize = (email: string) => email.trim().toLowerCase();

const findUserByEmail = (email: string) =>
  prisma.user.findFirst({
    where: { email: { equals: normalize(email), mode: "insensitive" } },
    select: { id: true, bloqueo: true },
  });

export const registrarIngreso = async (
  accion: AuditoriaIngreso,
  motivo: string,
  quien: { userId: string; email?: undefined } | { email: string; userId?: undefined },
) => {
  const institution = await prisma.organization.findUnique({
    where: { slug: institutionSlug },
    select: { id: true },
  });
  if (!institution) return;
  const userId = quien.userId ?? null;
  await prisma.auditLog.create({
    data: {
      organizationId: institution.id,
      userId,
      entity: "Ingreso",
      entityId: userId ?? normalize(quien.email ?? ""),
      action: accion,
      after: { motivo, ...(quien.email ? { email: normalize(quien.email) } : {}) },
    },
  });
};

const lockedError = (bloqueadoHasta: Date) =>
  new APIError("UNAUTHORIZED", {
    message: mensajeCuentaBloqueada(bloqueadoHasta),
    code: lockedAccountCode,
  });

const saveState = (userId: string, estado: EstadoBloqueo) =>
  prisma.bloqueoCuenta.upsert({
    where: { userId },
    create: { userId, ...estado },
    update: estado,
  });

// Antes de validar la contraseña: durante el bloqueo todo intento, aun con la contraseña
// correcta, recibe el mismo mensaje y no extiende el plazo. Un correo inexistente sigue al
// error genérico de credenciales para no revelar qué cuentas existen.
export const rejectIfLocked = async (email: string, now = new Date()) => {
  const user = await findUserByEmail(email);
  if (!user?.bloqueo) return;
  const estado = user.bloqueo;
  if (estaBloqueada(estado, now) && estado.bloqueadoHasta) {
    await registrarIngreso("ingreso_fallido", "Cuenta bloqueada", { userId: user.id });
    throw lockedError(estado.bloqueadoHasta);
  }
  if (estadoVigente(estado, now) === sinBloqueo) await saveState(user.id, sinBloqueo);
};

// Suma un fallo; el quinto bloquea y se informa en esa misma respuesta.
export const registerFailedPassword = async (email: string, now = new Date()) => {
  const user = await findUserByEmail(email);
  if (!user) {
    await registrarIngreso("ingreso_fallido", "Credenciales inválidas", { email });
    return;
  }
  const vigente = estadoVigente(user.bloqueo ?? sinBloqueo, now);
  const siguiente = registrarIntentoFallido(vigente, now);
  await saveState(user.id, siguiente);
  await registrarIngreso("ingreso_fallido", "Credenciales inválidas", { userId: user.id });
  if (!siguiente.bloqueadoHasta) return;
  await registrarIngreso("bloqueo", "Cinco intentos fallidos consecutivos", { userId: user.id });
  throw lockedError(siguiente.bloqueadoHasta);
};

export const resetFailedPasswords = async (userId: string) => {
  await prisma.bloqueoCuenta.deleteMany({ where: { userId } });
};
