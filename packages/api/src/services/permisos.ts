import type { AuthContext } from "@repo/auth";
import { prisma, type Prisma } from "@repo/db";
import type { Perfil } from "@repo/domain";

import { forbidden } from "../errors";

// Todo acceso denegado queda en auditoría (SEG-6) antes de responder "Acceso denegado".
export const accesoDenegado = async (auth: AuthContext, detalle: Prisma.InputJsonObject) => {
  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      userId: auth.userId,
      entity: "Permiso",
      entityId: auth.perfil,
      action: "acceso_denegado",
      after: detalle,
    },
  });
  return forbidden("Acceso denegado");
};

export const assertPerfil = async (auth: AuthContext, ...perfiles: Perfil[]) => {
  if (perfiles.includes(auth.perfil)) return;
  throw await accesoDenegado(auth, { requerido: perfiles });
};

export const esBedel = (auth: AuthContext) => auth.perfil === "BEDEL";
