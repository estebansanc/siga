import { auth, AuthApiError } from "@repo/auth";
import { prisma } from "@repo/db";
import { institutionSlug, mensajeEnlaceVencido, type DefinirContrasena } from "@repo/domain";

import "../auth-emails";
import { badRequest } from "../errors";

import { consumeRateLimit } from "./rate-limit";

const recoveryLinkLifetimeMs = 60 * 60 * 1000;
const emailRateLimit = { limit: 3, windowSeconds: 60 * 60 };

const isActiveAccount = async (correo: string) => {
  const user = await prisma.user.findUnique({
    where: { email: correo },
    select: {
      members: { where: { organization: { slug: institutionSlug } }, select: { id: true } },
      profile: { select: { activo: true } },
    },
  });
  return Boolean(user?.profile?.activo && user.members.length > 0);
};

// El enlace de Better Auth dura lo mismo para activar que para recuperar (24 horas); el de
// recuperación se acorta a 60 minutos (RF-12). Un pedido nuevo no invalida los anteriores.
const shortenRecoveryLinks = async (userId: string, now: Date) => {
  await prisma.verification.updateMany({
    where: {
      identifier: { startsWith: "reset-password:" },
      value: userId,
      expiresAt: { gt: new Date(now.getTime() + recoveryLinkLifetimeMs) },
    },
    data: { expiresAt: new Date(now.getTime() + recoveryLinkLifetimeMs) },
  });
};

// La respuesta no distingue cuentas: quien llama siempre ve el mismo mensaje, haya o no correo.
// El límite por IP lo aplica la ruta; este es el límite por correo.
export const solicitarRecuperacion = async (correo: string, now = new Date()) => {
  await consumeRateLimit(
    `correo:${correo}|recuperar-contrasena`,
    emailRateLimit.limit,
    emailRateLimit.windowSeconds,
    now,
  );
  if (!(await isActiveAccount(correo))) return;
  await auth.api.requestPasswordReset({
    body: { email: correo, redirectTo: "/definir-contrasena" },
  });
  const user = await prisma.user.findUnique({
    where: { email: correo },
    select: { id: true, emailVerified: true },
  });
  if (user?.emailVerified) await shortenRecoveryLinks(user.id, now);
};

export const definirContrasena = async ({ token, contrasena }: DefinirContrasena) => {
  try {
    await auth.api.resetPassword({ body: { newPassword: contrasena, token } });
  } catch (error) {
    if (error instanceof AuthApiError && error.body?.code === "INVALID_TOKEN") {
      throw badRequest(mensajeEnlaceVencido);
    }
    throw error;
  }
};
