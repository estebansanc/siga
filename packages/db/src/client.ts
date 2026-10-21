import { PrismaPg } from "@prisma/adapter-pg";

import { withAudit } from "./audit-extension";
import { PrismaClient } from "./generated/client";
import { timingExtension } from "./timing-extension";

const createClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta la variable de entorno DATABASE_URL");
  const adapter = new PrismaPg({ connectionString, max: 5 });
  return withAudit(new PrismaClient({ adapter })).$extends(timingExtension);
};

type Client = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as typeof globalThis & { prisma?: Client };

export const prisma: Client = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Db = Client;
// El cliente que recibe el callback de `prisma.$transaction`: el mismo, sin lo que no aplica
// dentro de una transacción.
export type DbTransaction = Omit<
  Db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
