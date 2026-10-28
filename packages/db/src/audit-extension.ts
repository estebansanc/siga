import { currentAuditActor } from "./audit-context";
import { Prisma, type PrismaClient } from "./generated/client";

// Entidades de negocio cuyos cambios quedan en `audit_log`. El producto agrega acá las suyas.
const auditedModels = [
  "Organization",
  "User",
  "Member",
  "Invitation",
  "UserProfile",
  "Carrera",
  "Materia",
  "PeriodoLectivo",
  "Comision",
  "Horario",
  "DiaNoLaborable",
  "EstadoInstitucional",
  "Novedad",
  "Aviso",
  "ClaseProgramada",
  "Aula",
  "SesionQr",
  "AsistenciaDocente",
  "Incidencia",
] as const;

type AuditedModel = (typeof auditedModels)[number];
type AuditedAction = "create" | "update" | "delete";

const isAudited = (model: string): model is AuditedModel =>
  auditedModels.includes(model as AuditedModel);

const toJson = (value: unknown) =>
  value === undefined
    ? Prisma.JsonNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

const readRecord = async (client: PrismaClient, model: AuditedModel, where: unknown) => {
  const delegate = client[uncapitalize(model)] as unknown as {
    findUnique: (args: { where: unknown }) => Promise<Record<string, unknown> | null>;
  };
  return delegate.findUnique({ where });
};

const uncapitalize = <T extends string>(value: T) =>
  (value.charAt(0).toLowerCase() + value.slice(1)) as Uncapitalize<T>;

export const withAudit = (client: PrismaClient) =>
  client.$extends({
    name: "audit",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);
          await record(client, model, "create", result, null, result);
          return result;
        },
        async update({ model, args, query }) {
          const before = isAudited(model) ? await readRecord(client, model, args.where) : null;
          const result = await query(args);
          await record(client, model, "update", result, before, result);
          return result;
        },
        async delete({ model, args, query }) {
          const before = isAudited(model) ? await readRecord(client, model, args.where) : null;
          const result = await query(args);
          await record(client, model, "delete", result, before, null);
          return result;
        },
      },
    },
  });

// Las entidades auditadas se identifican por `id`, salvo las que cuelgan de una cuenta
// (`UserProfile`), que se identifican por `userId`.
const entityIdOf = (result: unknown) => {
  const record = result as { id?: string; userId?: string } | null;
  return record?.id ?? record?.userId;
};

const record = async (
  client: PrismaClient,
  model: string,
  action: AuditedAction,
  result: unknown,
  before: unknown,
  after: unknown,
) => {
  if (!isAudited(model)) return;
  const actor = currentAuditActor();
  const entityId = entityIdOf(result);
  if (!actor || !entityId) return;
  await client.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.userId,
      entity: model,
      entityId,
      action,
      before: toJson(before),
      after: toJson(after),
    },
  });
};
