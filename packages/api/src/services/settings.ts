import { prisma } from "@repo/db";
import {
  presenciaInicial,
  presenciaSchema,
  turnosIniciales,
  turnosSchema,
  type Presencia,
  type Turnos,
  type UpdateSettingsInput,
} from "@repo/domain";

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

export const obtenerPresencia = async (organizationId: string): Promise<Presencia> => {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: { presencia: true },
  });
  const guardada = presenciaSchema.safeParse(settings?.presencia);
  return guardada.success ? guardada.data : presenciaInicial;
};

export const getSettings = async (organizationId: string): Promise<SettingsDto> => ({
  name: await findOrganizationName(organizationId),
  turnos: await obtenerTurnos(organizationId),
  presencia: await obtenerPresencia(organizationId),
});

export const updateSettings = async (
  organizationId: string,
  input: UpdateSettingsInput,
): Promise<SettingsDto> => {
  const { name, turnos, presencia } = input;
  const cambios = { turnos, presencia };
  await prisma.organizationSettings.upsert({
    where: { organizationId },
    create: { organizationId, ...cambios },
    update: cambios,
  });
  if (name !== undefined) await renameOrganization(organizationId, name);
  return getSettings(organizationId);
};
