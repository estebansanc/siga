import { roleOf } from "./enums";

// En el MVP hay una sola institución precargada por el seed (CFG-2). Auth, seed y tests la
// ubican por este slug.
export const institutionSlug = "utn-frt";
export const institutionName = "UTN Facultad Regional Tucumán";

// La sesión trabaja siempre en la institución si la cuenta es miembro; sin esa membresía
// (una baja de un Administrador) cae a la activa, a la propia (owner) o a la primera.
export const pickMembership = <T extends { organizationId: string; role: string }>(
  memberships: T[],
  institutionId: string | null,
  activeOrganizationId: string | null,
): T | undefined =>
  memberships.find((membership) => membership.organizationId === institutionId) ??
  memberships.find((membership) => membership.organizationId === activeOrganizationId) ??
  memberships.find((membership) => roleOf(membership.role) === "owner") ??
  memberships[0];
