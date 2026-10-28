import type { AuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import { mensajeVersionDesactualizada, type AceptarPoliticaInput } from "@repo/domain";

import { conflict } from "../errors";
import type { PoliticaPrivacidadDto } from "../schemas";

const obtenerVigente = () =>
  prisma.politicaPrivacidad.findFirstOrThrow({ orderBy: { version: "desc" } });

export const obtenerPoliticaVigente = async (auth: AuthContext): Promise<PoliticaPrivacidadDto> => {
  const politica = await obtenerVigente();
  const aceptacion = await prisma.aceptacionPolitica.findUnique({
    where: { userId_version: { userId: auth.userId, version: politica.version } },
  });
  return {
    version: politica.version,
    titulo: politica.titulo,
    texto: politica.texto,
    publicadaEn: politica.publicadaEn.toISOString(),
    aceptadaEn: aceptacion?.aceptadaEn.toISOString() ?? null,
  };
};

// Solo se acepta la versión vigente: si se publicó otra mientras se leía la anterior, no se
// registra nada (no se acepta un texto no visto) y el cliente vuelve a pedir la vigente.
export const aceptarPolitica = async (
  auth: AuthContext,
  input: AceptarPoliticaInput,
): Promise<PoliticaPrivacidadDto> => {
  const vigente = await obtenerVigente();
  if (input.version !== vigente.version) throw conflict(mensajeVersionDesactualizada);
  await prisma.aceptacionPolitica.upsert({
    where: { userId_version: { userId: auth.userId, version: vigente.version } },
    update: {},
    create: { userId: auth.userId, version: vigente.version },
  });
  return obtenerPoliticaVigente(auth);
};

export const tieneAceptacionPendiente = async (userId: string): Promise<boolean> => {
  const vigente = await obtenerVigente();
  const aceptacion = await prisma.aceptacionPolitica.findUnique({
    where: { userId_version: { userId, version: vigente.version } },
    select: { id: true },
  });
  return aceptacion === null;
};
