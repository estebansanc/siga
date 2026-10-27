import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma, runWithAuditActor } from "@repo/db";
import { institutionSlug, pickMembership } from "@repo/domain";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bearer, organization } from "better-auth/plugins";

import { authEnv } from "./env";

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

export const auth = betterAuth({
  baseURL: authEnv.baseUrl,
  secret: authEnv.secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  // La sesión viaja firmada en una cookie 5 minutos: la mayoría de las requests no tocan la
  // base para autenticar; una sesión revocada deja de servir al vencer la caché.
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
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
    session: {
      create: {
        before: async (session) => ({
          data: {
            ...session,
            activeOrganizationId: await resolveActiveOrganizationId(session.userId),
          },
        }),
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
