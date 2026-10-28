import { prisma } from "@repo/db";
import { institutionSlug, pickMembership, type MemberRole, type Perfil } from "@repo/domain";

import { roleOf } from "./roles";
import { auth } from "./server";

export class UnauthorizedError extends Error {
  constructor() {
    super("No autorizado");
    this.name = "UnauthorizedError";
  }
}

export type { MemberRole, Perfil };
export { roleOf };

export type LostOrganization = { id: string; name: string };

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: MemberRole;
  perfil: Perfil;
  userName: string;
  userEmail: string;
  lostOrganization: LostOrganization | null;
};

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

type Membership = { organizationId: string; role: string };

// La organización activa de la cookie puede haber dejado de tener membresía (el Administrador
// quitó al miembro): la organización en sí sigue existiendo, así que se nombra para el aviso
// antes de caer a la propia.
const resolveLostOrganization = async (
  organizationId: string | null,
): Promise<LostOrganization | null> => {
  if (!organizationId) return null;
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
};

// La cookie cachea la sesión y no se invalida al quitar al miembro: la membresía se lee en
// cada request. Con membresía en la institución se trabaja siempre en ella; si no, y la
// organización activa ya no tiene una, se vuelve a la propia (o a la primera) informando de
// qué organización se dejó (`removeMembership` deja la referencia vieja en la sesión a
// propósito, para poder nombrarla).
const resolveActiveMembership = async (
  userId: string,
  activeOrganizationId: string | null,
): Promise<{ membership: Membership; lostOrganization: LostOrganization | null } | null> => {
  const [memberships, institution] = await Promise.all([
    prisma.member.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    }),
    prisma.organization.findUnique({ where: { slug: institutionSlug }, select: { id: true } }),
  ]);
  const membership = pickMembership(memberships, institution?.id ?? null, activeOrganizationId);
  if (!membership) return null;
  const isLost =
    membership.organizationId !== institution?.id &&
    membership.organizationId !== activeOrganizationId;
  return {
    membership,
    lostOrganization: isLost ? await resolveLostOrganization(activeOrganizationId) : null,
  };
};

// El perfil de SiGA (Estudiante, Docente, Bedel o Autoridad) decide qué puede hacer cada
// cuenta. Una cuenta sin perfil o desactivada no tiene contexto: no entra.
const resolveActivePerfil = async (userId: string): Promise<Perfil | null> => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { perfil: true, activo: true },
  });
  return profile?.activo ? profile.perfil : null;
};

const toAuthContext = async (session: SessionResult): Promise<AuthContext | null> => {
  if (!session) return null;
  const resolution = await resolveActiveMembership(
    session.user.id,
    session.session.activeOrganizationId ?? null,
  );
  if (!resolution) return null;
  const perfil = await resolveActivePerfil(session.user.id);
  if (!perfil) return null;
  const { membership, lostOrganization } = resolution;
  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: roleOf(membership.role),
    perfil,
    userName: session.user.name,
    userEmail: session.user.email,
    lostOrganization,
  };
};

export const getAuthContext = async (headers: Headers): Promise<AuthContext | null> =>
  toAuthContext(await auth.api.getSession({ headers }));

// Para quien puede responder cookies (la API): además del contexto, las cookies con las que
// Better Auth renueva la caché de sesión.
export const readAuthContext = async (
  headers: Headers,
): Promise<{ auth: AuthContext | null; setCookies: string[] }> => {
  const { headers: responseHeaders, response } = await auth.api.getSession({
    headers,
    returnHeaders: true,
  });
  return { auth: await toAuthContext(response), setCookies: responseHeaders.getSetCookie() };
};

export const requireAuthContext = async (headers: Headers): Promise<AuthContext> => {
  const context = await getAuthContext(headers);
  if (!context) throw new UnauthorizedError();
  return context;
};

// Una sesión válida cuya cuenta desactivó un administrador: la web la distingue de "sin
// sesión" para decir "Tu cuenta está desactivada" en vez de pedir login en bucle.
export const isAccountDeactivated = async (headers: Headers): Promise<boolean> => {
  const session = await auth.api.getSession({ headers });
  if (!session) return false;
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { activo: true },
  });
  return profile?.activo === false;
};
