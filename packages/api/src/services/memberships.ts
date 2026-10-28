import { roleOf } from "@repo/auth";
import { prisma } from "@repo/db";

import { badRequest, notFound } from "../errors";
import type { MemberDto } from "../schemas";
import { toIso } from "../serializers";

export const findOwnedOrganizationId = async (userId: string) => {
  const membership = await prisma.member.findFirst({
    where: { userId, role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  if (!membership) throw notFound("Organización propia");
  return membership.organizationId;
};

// Las organizaciones de la cuenta (la propia y las demás a las que pertenece), para saber de cuáles
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
