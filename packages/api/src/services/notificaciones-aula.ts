import { fromDateColumn, type DbTransaction, type EmailOutbox } from "@repo/db";
import { horaArgentina } from "@repo/domain";

import { runDeferred } from "../deferred";
import { apiEnv } from "../env";

import { deliverEmail } from "./emails/outbox";
import { solicitudAulaEmail, type ResolucionAula } from "./emails/templates";

export type ClaseParaCorreo = {
  fecha: Date;
  inicio: Date;
  fin: Date;
  comisionId: string;
  comision: { codigo: string; materia: { nombre: string } };
};

type Resolucion = {
  resolucion: ResolucionAula;
  clase: ClaseParaCorreo;
  aula: string;
  aulaAnterior?: string | null;
  motivo?: string | null;
};

// Los correos entran al outbox en la misma transacción que la resolución: o quedan los dos o
// ninguno. El envío va después, y si falla el cron lo reintenta.
export const registrarCorreosDeAula = async (
  tx: DbTransaction,
  organizationId: string,
  { clase, resolucion, aula, aulaAnterior = null, motivo = null }: Resolucion,
): Promise<EmailOutbox[]> => {
  const docentes = await tx.comisionDocente.findMany({
    where: { comisionId: clase.comisionId },
    select: { docente: { select: { email: true } } },
  });
  const contenido = solicitudAulaEmail({
    resolucion,
    materia: clase.comision.materia.nombre,
    comision: clase.comision.codigo,
    fecha: fromDateColumn(clase.fecha),
    horaInicio: horaArgentina(clase.inicio),
    horaFin: horaArgentina(clase.fin),
    aula,
    aulaAnterior,
    motivo,
    url: `${apiEnv.appUrl}/clases`,
  });
  return tx.emailOutbox.createManyAndReturn({
    data: docentes.map(({ docente }) => ({ organizationId, to: docente.email, ...contenido })),
  });
};

export const entregarCorreosDeAula = async (correos: EmailOutbox[]) => {
  await runDeferred("correos-aula", async () => {
    for (const correo of correos) {
      try {
        await deliverEmail(correo);
      } catch (error) {
        console.error(error);
      }
    }
  });
};
