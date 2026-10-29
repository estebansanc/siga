import type { AuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import { bajaPendienteDesde, type SolicitarBajaInput, type UpdateProfileInput } from "@repo/domain";

import { conflict } from "../errors";
import type { MeDto } from "../schemas";

import { listOrganizationsOf } from "./memberships";
import { tieneAceptacionPendiente } from "./politica-privacidad";
import { assertDatosLibres } from "./usuarios";

// "Quién soy": la sesión ya resuelve rol y organización activa (`AuthContext`); esto agrega la
// lista de organizaciones de la cuenta y el nombre leído de la base, así un cambio hecho
// en Mi perfil se ve sin esperar a que venza la caché de sesión en cookie. `lostOrganization`
// pasa igual la que ya resolvió la sesión: la organización que se dejó, para el aviso del shell.
export const getMe = async (auth: AuthContext): Promise<MeDto> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    select: {
      name: true,
      email: true,
      profile: {
        select: { dni: true, legajo: true, bajaSolicitadaAt: true, bajaResueltaAt: true },
      },
    },
  });
  const bajaSolicitadaEn = user.profile ? bajaPendienteDesde(user.profile) : null;
  return {
    userId: auth.userId,
    userName: user.name,
    userEmail: user.email,
    dni: user.profile?.dni ?? null,
    legajo: user.profile?.legajo ?? null,
    bajaSolicitadaEn: bajaSolicitadaEn?.toISOString() ?? null,
    organizationId: auth.organizationId,
    role: auth.role,
    perfil: auth.perfil,
    organizations: await listOrganizationsOf(auth.userId),
    politicaPendiente: await tieneAceptacionPendiente(auth.userId),
    lostOrganization: auth.lostOrganization,
  };
};

const profileOf = (userId: string) =>
  prisma.userProfile.findUniqueOrThrow({
    where: { userId },
    select: { organizationId: true, dni: true, bajaSolicitadaAt: true, bajaResueltaAt: true },
  });

export const updateProfile = async (auth: AuthContext, input: UpdateProfileInput) => {
  const profile = await profileOf(auth.userId);
  if (input.dni && input.dni !== profile.dni) {
    await assertDatosLibres(profile.organizationId, { dni: input.dni }, auth.userId);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: auth.userId }, data: { name: input.name } }),
    prisma.userProfile.update({
      where: { userId: auth.userId },
      data: { dni: input.dni, legajo: input.legajo },
    }),
  ]);
  return getMe(auth);
};

export const solicitarBaja = async (auth: AuthContext, input: SolicitarBajaInput) => {
  const profile = await profileOf(auth.userId);
  if (bajaPendienteDesde(profile)) {
    throw conflict("Ya solicitaste la baja de tu cuenta");
  }
  await prisma.userProfile.update({
    where: { userId: auth.userId },
    data: { bajaSolicitadaAt: new Date(), bajaMotivo: input.motivo ?? null, bajaResueltaAt: null },
  });
  return getMe(auth);
};
