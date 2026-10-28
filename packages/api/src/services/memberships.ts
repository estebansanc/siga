import { auth, AuthApiError, roleOf } from "@repo/auth";
import { prisma } from "@repo/db";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { ApiError, badRequest, notFound } from "../errors";
import type { MemberDto } from "../schemas";
import { toIso } from "../serializers";

// Único punto de contacto con Better Auth desde la API: invitaciones, membresías y
// organización activa se resuelven con los headers de la request que llega.

export const findOwnedOrganizationId = async (userId: string) => {
  const membership = await prisma.member.findFirst({
    where: { userId, role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  if (!membership) throw notFound("Organización propia");
  return membership.organizationId;
};

// Las organizaciones de la cuenta (la propia y las que la invitaron), para saber de cuáles
// es miembro.
export const listOrganizationsOf = async (userId: string) => {
  const memberships = await prisma.member.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
  });
  return memberships.map(({ role, organization }) => ({ ...organization, role: roleOf(role) }));
};

// El Administrador primero, el resto por orden de ingreso.
export const listMembers = async (organizationId: string): Promise<MemberDto[]> => {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return members
    .map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: roleOf(member.role),
      createdAt: toIso(member.createdAt),
    }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));
};

export const findMemberByEmail = (organizationId: string, email: string) =>
  prisma.member.findFirst({
    where: { organizationId, user: { email: { equals: email, mode: "insensitive" } } },
  });

const pendingInvitationWhere = (organizationId: string) => ({
  organizationId,
  status: "pending",
  expiresAt: { gt: new Date() },
});

export const findPendingInvitation = (organizationId: string, email: string) =>
  prisma.invitation.findFirst({
    where: {
      ...pendingInvitationWhere(organizationId),
      email: { equals: email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
  });

export const listPendingInvitations = (organizationId: string) =>
  prisma.invitation.findMany({
    where: pendingInvitationWhere(organizationId),
    orderBy: { createdAt: "asc" },
  });

export const createInvitation = (
  headers: Headers,
  input: { organizationId: string; email: string },
) =>
  callAuth(() =>
    auth.api.createInvitation({
      headers,
      body: { organizationId: input.organizationId, email: input.email, role: "member" },
    }),
  );

export const cancelInvitation = (headers: Headers, invitationId: string) =>
  callAuth(() => auth.api.cancelInvitation({ headers, body: { invitationId } }));

export const acceptInvitation = (headers: Headers, invitationId: string) =>
  callAuth(() => auth.api.acceptInvitation({ headers, body: { invitationId } }));

export const rejectInvitation = (headers: Headers, invitationId: string) =>
  callAuth(() => auth.api.rejectInvitation({ headers, body: { invitationId } }));

export const setActiveOrganization = (headers: Headers, organizationId: string) =>
  callAuth(() => auth.api.setActiveOrganization({ headers, body: { organizationId } }));

// Quitar la membresía no pasa por Better Auth: no hace falta la sesión del que la quita y la
// sesión del que sale vuelve sola a su organización propia (se lee en cada request,
// `packages/auth/src/session.ts`). La cookie de sesión no se toca a propósito: sigue apuntando
// a esta organización para que ese mismo request pueda nombrarla en el aviso de acceso perdido
// antes de caer a la propia.
export const removeMembership = async (organizationId: string, userId: string) => {
  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!member) throw notFound("Miembro");
  if (roleOf(member.role) === "owner") throw badRequest("El Administrador no se puede quitar");
  await prisma.member.delete({ where: { id: member.id } });
};

const authErrorMessages: Record<string, string> = {
  INVITATION_NOT_FOUND: "La invitación ya no está vigente",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "Esta invitación es para otro email",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Ese email ya es miembro de la organización",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "Ya hay una invitación vigente para ese email",
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION: "No sos miembro de esa organización",
  MEMBER_NOT_FOUND: "No sos miembro de esa organización",
};

// Los errores de Better Auth salen como errores de la API, con status numérico y mensaje
// en español.
const toApiError = (error: AuthApiError) => {
  const code = error.body?.code ?? "AUTH_ERROR";
  return new ApiError(
    error.statusCode as ContentfulStatusCode,
    code,
    authErrorMessages[code] ?? error.body?.message ?? "No se pudo completar la acción",
  );
};

const callAuth = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw error instanceof AuthApiError ? toApiError(error) : error;
  }
};
