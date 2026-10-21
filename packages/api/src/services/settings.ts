import { prisma } from "@repo/db";
import { turnosIniciales, turnosSchema, type Turnos, type UpdateSettingsInput } from "@repo/domain";

import type { SettingsDto } from "../schemas";

import { findOrganizationName, renameOrganization } from "./organizations";

// El nombre vive en `Organization`; el resto de las preferencias, en `OrganizationSettings`,
// que nace con el primer PATCH. Sin turnos guardados rigen los iniciales (CFG-1).
export const obtenerTurnos = async (organizationId: string): Promise<Turnos> => {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: { turnos: true },
  });
  const guardados = turnosSchema.safeParse(settings?.turnos);
  return guardados.success ? guardados.data : turnosIniciales;
};

export const getSettings = async (organizationId: string): Promise<SettingsDto> => ({
  name: await findOrganizationName(organizationId),
  turnos: await obtenerTurnos(organizationId),
});

export const updateSettings = async (
  organizationId: string,
  input: UpdateSettingsInput,
): Promise<SettingsDto> => {
  const { name, turnos } = input;
  await prisma.organizationSettings.upsert({
    where: { organizationId },
    create: { organizationId, turnos },
    update: { turnos },
  });
  if (name !== undefined) await renameOrganization(organizationId, name);
  return getSettings(organizationId);
};
