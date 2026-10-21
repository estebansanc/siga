import { prisma } from "@repo/db";

import { notFound } from "../errors";
import type { AulaDto } from "../schemas";

// CU-17 reducido al Cambio de aula: aulas activas y disponibles sin otra clase en la franja
// de cada clase elegida, de menor a mayor capacidad.
export const listarAulasDisponibles = async (
  organizationId: string,
  claseIds: string[],
): Promise<AulaDto[]> => {
  const clases = await prisma.claseProgramada.findMany({
    where: { id: { in: claseIds }, organizationId },
    select: { id: true, inicio: true, fin: true },
  });
  if (clases.length !== new Set(claseIds).size) throw notFound("Clase");
  const aulas = await prisma.aula.findMany({
    where: {
      organizationId,
      activa: true,
      estado: "DISPONIBLE",
      clases: {
        none: {
          id: { notIn: claseIds },
          OR: clases.map((clase) => ({ inicio: { lt: clase.fin }, fin: { gt: clase.inicio } })),
        },
      },
    },
    orderBy: [{ capacidad: "asc" }, { codigo: "asc" }],
    select: {
      id: true,
      codigo: true,
      edificio: true,
      piso: true,
      capacidad: true,
      equipamiento: true,
    },
  });
  return aulas;
};
