import type { AuthContext } from "@repo/auth";
import { prisma, type Invitation } from "@repo/db";
import type { InvitationStatus, InviteMemberInput } from "@repo/domain";

import { runDeferred } from "../deferred";
import { apiEnv } from "../env";
import { conflict, notFound } from "../errors";
import type { InvitationDto, InvitationResolutionDto, PendingInvitationDto } from "../schemas";
import { toIso } from "../serializers";

import { enqueueEmail } from "./emails/outbox";
import { invitationEmail } from "./emails/templates";
import * as memberships from "./memberships";
import { findOrganizationName } from "./organizations";

export type Actor = { auth: AuthContext; headers: Headers };

const invitationUrl = (invitationId: string) => `${apiEnv.appUrl}/invitacion/${invitationId}`;

const toPendingInvitationDto = (
  invitation: Pick<Invitation, "id" | "email" | "expiresAt" | "createdAt">,
): PendingInvitationDto => ({
  id: invitation.id,
  email: invitation.email,
  expiresAt: toIso(invitation.expiresAt),
  createdAt: toIso(invitation.createdAt),
});

// El email puede esperar a después de responder (`runDeferred`): la invitación ya existe y
// el link sigue siendo el mismo.
const sendInvitationEmail = async (
  auth: AuthContext,
  invitation: Pick<Invitation, "id" | "email" | "expiresAt">,
) => {
  const [organizationName, inviter] = await Promise.all([
    findOrganizationName(auth.organizationId),
    prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { name: true } }),
  ]);
  await runDeferred("email", () =>
    enqueueEmail(auth.organizationId, {
      to: invitation.email,
      ...invitationEmail({
        organizationName,
        inviterName: inviter.name,
        url: invitationUrl(invitation.id),
        expiresAt: invitation.expiresAt,
      }),
    }),
  );
};

export const listPendingInvitations = async (
  organizationId: string,
): Promise<PendingInvitationDto[]> =>
  (await memberships.listPendingInvitations(organizationId)).map(toPendingInvitationDto);

export const inviteMember = async (
  { auth, headers }: Actor,
  input: InviteMemberInput,
): Promise<PendingInvitationDto> => {
  if (await memberships.findMemberByEmail(auth.organizationId, input.email)) {
    throw conflict("Ese email ya es miembro de la organización");
  }
  if (await memberships.findPendingInvitation(auth.organizationId, input.email)) {
    throw conflict("Ya hay una invitación vigente para ese email");
  }
  const invitation = await memberships.createInvitation(headers, {
    organizationId: auth.organizationId,
    email: input.email,
  });
  await sendInvitationEmail(auth, invitation);
  return toPendingInvitationDto(invitation);
};

const findPendingInvitationOf = async (organizationId: string, invitationId: string) => {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId, status: "pending", expiresAt: { gt: new Date() } },
  });
  if (!invitation) throw notFound("Invitación vigente");
  return invitation;
};

// Reenviar manda otro email con el mismo link y el mismo vencimiento: el primero sigue
// sirviendo.
export const resendInvitation = async (
  { auth }: Actor,
  invitationId: string,
): Promise<PendingInvitationDto> => {
  const invitation = await findPendingInvitationOf(auth.organizationId, invitationId);
  await sendInvitationEmail(auth, invitation);
  return toPendingInvitationDto(invitation);
};

export const cancelInvitation = async ({ auth, headers }: Actor, invitationId: string) => {
  const invitation = await findPendingInvitationOf(auth.organizationId, invitationId);
  await memberships.cancelInvitation(headers, invitation.id);
};

const findInvitation = async (invitationId: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation) throw notFound("Invitación");
  return invitation;
};

const resolvedStatuses: Record<string, InvitationStatus> = {
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  canceled: "CANCELED",
};

const invitationStatusOf = (invitation: Invitation): InvitationStatus => {
  if (invitation.status !== "pending") return resolvedStatuses[invitation.status] ?? "CANCELED";
  return invitation.expiresAt > new Date() ? "PENDING" : "EXPIRED";
};

const sameEmail = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const getInvitation = async (
  auth: AuthContext,
  invitationId: string,
): Promise<InvitationDto> => {
  const invitation = await findInvitation(invitationId);
  return {
    id: invitation.id,
    organizationName: invitation.organization.name,
    status: invitationStatusOf(invitation),
    expiresAt: toIso(invitation.expiresAt),
    forCurrentUser: sameEmail(invitation.email, auth.userEmail),
  };
};

export const acceptInvitation = async (
  { auth, headers }: Actor,
  invitationId: string,
): Promise<InvitationResolutionDto> => {
  const invitation = await findInvitation(invitationId);
  await memberships.acceptInvitation(headers, invitation.id);
  // Better Auth deja activa la organización aceptada; una cuenta con organización propia
  // sigue en ella y cambia desde el selector cuando quiere. En SiGA las cuentas nuevas entran
  // a la institución sin organización propia: entonces la aceptada queda activa.
  const ownedOrganizationId = await memberships
    .findOwnedOrganizationId(auth.userId)
    .catch(() => null);
  if (ownedOrganizationId) await memberships.setActiveOrganization(headers, ownedOrganizationId);
  return { organizationName: invitation.organization.name };
};

export const rejectInvitation = async (
  { headers }: Actor,
  invitationId: string,
): Promise<InvitationResolutionDto> => {
  const invitation = await findInvitation(invitationId);
  await memberships.rejectInvitation(headers, invitation.id);
  return { organizationName: invitation.organization.name };
};
