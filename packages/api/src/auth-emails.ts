import { configureAuthEmails } from "@repo/auth";
import { prisma } from "@repo/db";
import { institutionSlug } from "@repo/domain";

import { enqueueEmail } from "./services/emails/outbox";
import {
  activationEmail,
  passwordResetEmail,
  verificationEmail,
} from "./services/emails/templates";

const institutionId = async () => {
  const institution = await prisma.organization.findUnique({
    where: { slug: institutionSlug },
    select: { id: true },
  });
  if (!institution) throw new Error(`No existe la institución "${institutionSlug}"`);
  return institution.id;
};

// Importar este módulo registra en `packages/auth` quién envía los correos de la cuenta, por
// la cola `EmailOutbox`. Lo importan quienes montan Better Auth y los servicios que lo usan.
configureAuthEmails({
  sendVerification: async ({ to, name, url }) => {
    await enqueueEmail(await institutionId(), { to, ...verificationEmail({ nombre: name, url }) });
  },
  sendPasswordReset: async ({ to, name, url }) => {
    await enqueueEmail(await institutionId(), { to, ...passwordResetEmail({ nombre: name, url }) });
  },
  sendActivation: async ({ to, name, url }) => {
    await enqueueEmail(await institutionId(), { to, ...activationEmail({ nombre: name, url }) });
  },
});
