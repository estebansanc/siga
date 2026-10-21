import { currentAuditActor, type DbTransaction, type Prisma } from "@repo/db";

// La extensión de auditoría registra `create`, `update` y `delete` de a uno y fuera de la
// transacción. Los cambios masivos (suspender o finalizar clases, reemplazar comisiones
// seguidas) se registran a mano, dentro de la misma transacción, con los ids afectados.
export const registrarCambioMasivo = async (
  tx: Pick<DbTransaction, "auditLog">,
  organizationId: string,
  entity: string,
  action: string,
  after: Prisma.InputJsonObject,
) => {
  await tx.auditLog.create({
    data: {
      organizationId,
      userId: currentAuditActor()?.userId ?? null,
      entity,
      entityId: action,
      action,
      after,
    },
  });
};
