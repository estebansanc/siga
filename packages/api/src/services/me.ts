import type { AuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import type { UpdateProfileInput } from "@repo/domain";

import type { MeDto } from "../schemas";

import { listOrganizationsOf } from "./memberships";

// "Quién soy": la sesión ya resuelve rol y organización activa (`AuthContext`); esto agrega la
// lista de organizaciones para el selector y el nombre leído de la base, así un cambio hecho
// en Mi perfil se ve sin esperar a que venza la caché de sesión en cookie. `lostOrganization`
// pasa igual la que ya resolvió la sesión: la organización que se dejó, para el aviso del shell.
export const getMe = async (auth: AuthContext): Promise<MeDto> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    select: { name: true, email: true },
  });
  return {
    userId: auth.userId,
    userName: user.name,
    userEmail: user.email,
    organizationId: auth.organizationId,
    role: auth.role,
    perfil: auth.perfil,
    organizations: await listOrganizationsOf(auth.userId),
    lostOrganization: auth.lostOrganization,
  };
};

export const updateProfile = async (auth: AuthContext, input: UpdateProfileInput) => {
  await prisma.user.update({ where: { id: auth.userId }, data: { name: input.name } });
  return getMe(auth);
};
