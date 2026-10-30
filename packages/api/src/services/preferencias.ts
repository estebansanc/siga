import type { AuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import type { ActualizarPreferenciasInput } from "@repo/domain";

import { unprocessable } from "../errors";
import type { PreferenciasDto } from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { comisionInclude, toComisionDto } from "./datos-academicos";
import { assertPerfil } from "./permisos";

// RF-17: las comisiones seguidas filtran "Mis clases" del estudiante y definen a quién se le
// notifica por correo cuando están activadas las opciones de correo.
export const obtenerPreferencias = async (auth: AuthContext): Promise<PreferenciasDto> => {
  await assertPerfil(auth, "ESTUDIANTE");
  const seguidas = await prisma.comisionSeguida.findMany({
    where: { userId: auth.userId, comision: { activa: true } },
    include: { comision: { include: comisionInclude } },
    orderBy: [{ comision: { materia: { anioCarrera: "asc" } } }, { comision: { codigo: "asc" } }],
  });
  const perfil = await prisma.userProfile.findUniqueOrThrow({
    where: { userId: auth.userId },
    select: { notificarNovedadesPorCorreo: true, notificarAvisosPorCorreo: true },
  });
  return { comisiones: seguidas.map(({ comision }) => toComisionDto(comision)), ...perfil };
};

export const actualizarPreferencias = async (
  auth: AuthContext,
  input: ActualizarPreferenciasInput,
): Promise<PreferenciasDto> => {
  await assertPerfil(auth, "ESTUDIANTE");
  // Sin `comisionIds` se guardan solo las opciones de correo y las comisiones quedan como están.
  const comisionIds = input.comisionIds ? [...new Set(input.comisionIds)] : undefined;
  if (comisionIds) {
    const existentes = await prisma.comision.count({
      where: { id: { in: comisionIds }, organizationId: auth.organizationId, activa: true },
    });
    if (existentes !== comisionIds.length)
      throw unprocessable("Alguna comisión ya no está disponible");
  }

  await prisma.$transaction(async (tx) => {
    if (comisionIds) {
      await tx.comisionSeguida.deleteMany({ where: { userId: auth.userId } });
      await tx.comisionSeguida.createMany({
        data: comisionIds.map((comisionId) => ({
          userId: auth.userId,
          comisionId,
          organizationId: auth.organizationId,
        })),
      });
    }
    const { notificarNovedadesPorCorreo, notificarAvisosPorCorreo } = input;
    await tx.userProfile.update({
      where: { userId: auth.userId },
      data: { notificarNovedadesPorCorreo, notificarAvisosPorCorreo },
    });
    await registrarCambioMasivo(tx, auth.organizationId, "ComisionSeguida", "preferencias", {
      userId: auth.userId,
      comisionIds,
      notificarNovedadesPorCorreo,
      notificarAvisosPorCorreo,
    });
  });
  return obtenerPreferencias(auth);
};
