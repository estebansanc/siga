import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma, runWithAuditActor } from "@repo/db";
import {
  contrasenaSchema,
  correoEnDominiosPermitidos,
  horasDeInactividad,
  institutionSlug,
  mensajeContrasena,
  mensajeDominiosRechazados,
  pickMembership,
} from "@repo/domain";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { bearer, organization } from "better-auth/plugins";

import { authEmails } from "./emails";
import { authEnv } from "./env";
import {
  registerFailedPassword,
  registrarIngreso,
  rejectIfLocked,
  resetFailedPasswords,
} from "./login-security";

const linkLifetimeSeconds = 24 * 60 * 60;
const passwordPaths: Record<string, "password" | "newPassword"> = {
  "/sign-up/email": "password",
  "/reset-password": "newPassword",
};

const signInEmailPath = "/sign-in/email";
const signOutPath = "/sign-out";
const invalidCredentialsCode = "INVALID_EMAIL_OR_PASSWORD";
const inactivitySeconds = horasDeInactividad * 60 * 60;
const sessionRenewalSeconds = 60;

const requestResetPaths = new Set(["/request-password-reset", "/forget-password"]);

export const deactivatedAccountMessage = "Tu cuenta está desactivada";

const invitationExpiresInSeconds = 7 * 24 * 60 * 60;

// SiGA tiene una sola institución, precargada por el seed (CFG-2). Una cuenta nueva (el
// autorregistro) entra como miembro con perfil Estudiante, el único que una persona puede
// asignarse sola; Docente, Bedel y Autoridad los asigna un administrador.
const joinInstitutionAsStudent = async (userId: string) => {
  const institution = await prisma.organization.findUnique({
    where: { slug: institutionSlug },
    select: { id: true },
  });
  if (!institution) {
    throw new Error(`No existe la institución "${institutionSlug}". Corré pnpm db:seed.`);
  }
  await runWithAuditActor({ userId, organizationId: institution.id }, async () => {
    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: institution.id,
        userId,
        role: "member",
        createdAt: new Date(),
      },
    });
    await prisma.userProfile.create({
      data: { userId, organizationId: institution.id, perfil: "ESTUDIANTE" },
    });
  });
  return institution.id;
};

// La organización activa de cada sesión nueva: la institución si la cuenta es miembro; si solo
// tiene otras membresías, la propia o la primera (no se la da de alta, para no revertir una
// baja); y si no tiene ninguna, la institución (primera sesión de la cuenta).
const resolveActiveOrganizationId = async (userId: string) => {
  const [memberships, institution] = await Promise.all([
    prisma.member.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    }),
    prisma.organization.findUnique({ where: { slug: institutionSlug }, select: { id: true } }),
  ]);
  const preferred = pickMembership(memberships, institution?.id ?? null, null);
  return preferred ? preferred.organizationId : joinInstitutionAsStudent(userId);
};

const appOrigin = new URL(authEnv.baseUrl).origin;

const rejectDisallowedDomain = async (email: string) => {
  const settings = await prisma.organizationSettings.findFirst({
    where: { organization: { slug: institutionSlug } },
    select: { dominiosPermitidos: true },
  });
  const dominios = settings?.dominiosPermitidos ?? [];
  if (!correoEnDominiosPermitidos(email, dominios)) {
    throw new APIError("BAD_REQUEST", { message: mensajeDominiosRechazados(dominios) });
  }
};

const rejectDeactivatedAccount = async (userId: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { activo: true },
  });
  if (profile && !profile.activo) {
    throw new APIError("FORBIDDEN", {
      message: deactivatedAccountMessage,
      code: "ACCOUNT_DEACTIVATED",
    });
  }
};

export const auth = betterAuth({
  baseURL: authEnv.baseUrl,
  secret: authEnv.secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: linkLifetimeSeconds,
    revokeSessionsOnPasswordReset: true,
    // Una cuenta sin verificar recibe el enlace de activación (abrirlo verifica el correo); una
    // verificada, el de recuperación.
    sendResetPassword: ({ user, token }) => {
      const emails = authEmails();
      if (user.emailVerified) {
        return emails.sendPasswordReset({
          to: user.email,
          name: user.name,
          url: `${appOrigin}/definir-contrasena?token=${token}`,
        });
      }
      return emails.sendActivation({
        to: user.email,
        name: user.name,
        url: `${appOrigin}/activar-cuenta?token=${token}&email=${encodeURIComponent(user.email)}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    },
  },
  emailVerification: {
    expiresIn: linkLifetimeSeconds,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) =>
      authEmails().sendVerification({ to: user.email, name: user.name, url }),
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === signInEmailPath) {
        const email = (ctx.body as Record<string, unknown> | undefined)?.email;
        if (typeof email === "string") await rejectIfLocked(email);
        return;
      }
      // Cerrar sesión invalida todas las sesiones de la cuenta, web y bearer. Se leen antes
      // de que el cierre borre la sesión actual.
      if (ctx.path === signOutPath) {
        const session = await getSessionFromCtx(ctx);
        if (session) await prisma.session.deleteMany({ where: { userId: session.user.id } });
        return;
      }
      // El pedido de recuperación pasa por la API de SiGA (límites, cuentas desactivadas, 60
      // minutos): por HTTP directo se omitiría todo eso. `auth.api.*` desde el servidor no
      // trae `request`.
      if (ctx.request && requestResetPaths.has(ctx.path)) {
        throw new APIError("NOT_FOUND", { message: "Not found" });
      }
      const field = passwordPaths[ctx.path];
      if (!field) return;
      const password = (ctx.body as Record<string, unknown> | undefined)?.[field];
      if (!contrasenaSchema.safeParse(password).success) {
        throw new APIError("BAD_REQUEST", { message: mensajeContrasena });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== signInEmailPath) return;
      const returned = ctx.context.returned;
      const newSession = ctx.context.newSession;
      if (newSession) {
        await resetFailedPasswords(newSession.user.id);
        return;
      }
      const email = (ctx.body as Record<string, unknown> | undefined)?.email;
      if (
        returned instanceof APIError &&
        (returned.body as { code?: string } | undefined)?.code === invalidCredentialsCode &&
        typeof email === "string"
      ) {
        await registerFailedPassword(email);
      }
    }),
  },
  // La sesión vence tras 8 horas sin requests; cada uso la renueva (con un minuto de
  // granularidad). No hay caché de cookie: una sesión revocada o vencida deja de servir en la
  // próxima request, que es lo que exigen el cierre global y la inactividad.
  session: { expiresIn: inactivitySeconds, updateAge: sessionRenewalSeconds },
  rateLimit: { enabled: authEnv.rateLimitEnabled },
  socialProviders: {
    google: {
      clientId: authEnv.googleClientId,
      clientSecret: authEnv.googleClientSecret,
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  databaseHooks: {
    // El autorregistro y Google respetan los dominios permitidos (RF-10); las altas de
    // Bedel y Autoridad no pasan por acá.
    user: {
      create: {
        before: async (user) => {
          await rejectDisallowedDomain(user.email);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          await rejectDeactivatedAccount(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: await resolveActiveOrganizationId(session.userId),
            },
          };
        },
        after: async (session) => {
          await registrarIngreso("ingreso_exitoso", "Ingreso exitoso", { userId: session.userId });
        },
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      invitationExpiresIn: invitationExpiresInSeconds,
      // Las cuentas por email no verifican el email; el vínculo lo garantiza la sesión.
      requireEmailVerificationOnInvitation: false,
    }),
    bearer(),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
