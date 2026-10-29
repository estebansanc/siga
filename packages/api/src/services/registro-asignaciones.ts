import type { DbTransaction } from "@repo/db";
import type { OrigenAsignacionAula } from "@repo/domain";

// EF-5: cada vez que una clase recibe aula queda registrado quién, cómo y cuándo, en la
// misma transacción que la asignación.
export const registrarAsignacionAula = (
  tx: Pick<DbTransaction, "asignacionAula">,
  datos: {
    organizationId: string;
    claseId: string;
    aulaId: string;
    origen: OrigenAsignacionAula;
    usuarioId: string;
  },
) => tx.asignacionAula.create({ data: datos });

export const registrarAsignacionesAula = (
  tx: Pick<DbTransaction, "asignacionAula">,
  datos: Parameters<typeof registrarAsignacionAula>[1][],
) => tx.asignacionAula.createMany({ data: datos });
