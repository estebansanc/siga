import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma } from "@repo/db";
import {
  esHoraFutura,
  fechaArgentina,
  horaArgentina,
  instanteArgentino,
  metodoAsistenciaLabels,
  type MetodoAsistencia,
  type RegistroManualInput,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type { AsistenciaDto } from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { asistenciaInclude, finalizarClasesVencidas, toAsistenciaDto } from "./clases";
import { assertPerfil } from "./permisos";

const estadosConAsistenciaPendiente = ["PROGRAMADA", "DEMORADA"] as const;

export const mensajeAsistenciaRegistrada = (metodo: MetodoAsistencia, horaLlegada: Date) =>
  `Esta clase ya tiene asistencia registrada: ${metodoAsistenciaLabels[metodo]} a las ${horaArgentina(horaLlegada)}.`;

const asistenciaDeLaClase = (claseId: string) =>
  prisma.asistenciaDocente.findUnique({ where: { claseId } });

const errorClaseConAsistencia = async (claseId: string) => {
  const existente = await asistenciaDeLaClase(claseId);
  return existente
    ? conflict(mensajeAsistenciaRegistrada(existente.metodo, existente.horaLlegada))
    : null;
};

const buscarClaseElegible = async (auth: AuthContext, input: RegistroManualInput, ahora: Date) => {
  const clase = await prisma.claseProgramada.findFirst({
    where: { id: input.claseId, organizationId: auth.organizationId },
    include: { comision: { include: { docentes: { select: { docenteId: true } } } } },
  });
  if (!clase) throw notFound("Clase");
  const duplicada = await errorClaseConAsistencia(clase.id);
  if (duplicada) throw duplicada;
  if (!(estadosConAsistenciaPendiente as readonly string[]).includes(clase.estado)) {
    throw unprocessable("La clase no admite registro de asistencia en su estado actual");
  }
  if (fromDateColumn(clase.fecha) !== fechaArgentina(ahora)) {
    throw unprocessable("Solo se puede registrar la asistencia de clases de hoy");
  }
  if (!clase.comision.docentes.some(({ docenteId }) => docenteId === input.docenteId)) {
    throw unprocessable("El docente no dicta esta comisión");
  }
  if (esHoraFutura(input.horaLlegada, ahora)) {
    throw unprocessable("La hora de llegada no puede ser posterior a la hora actual.");
  }
  return clase;
};

// RF-18: contingencia del Bedel cuando el docente no puede usar el QR. Todo o nada: la
// asistencia (única por clase), el paso a Docente presente y la auditoría van en una transacción.
export const registrarAsistenciaManual = async (
  auth: AuthContext,
  input: RegistroManualInput,
  ahora = new Date(),
): Promise<AsistenciaDto> => {
  await assertPerfil(auth, "BEDEL");
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const clase = await buscarClaseElegible(auth, input, ahora);

  try {
    const asistencia = await prisma.$transaction(async (tx) => {
      const { count } = await tx.claseProgramada.updateMany({
        where: { id: clase.id, estado: { in: [...estadosConAsistenciaPendiente] } },
        data: { estado: "DOCENTE_PRESENTE" },
      });
      if (count === 0) throw unprocessable("La clase cambió de estado: volvé a intentarlo");
      await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "docente_presente", {
        claseIds: [clase.id],
        metodo: "MANUAL",
      });
      return tx.asistenciaDocente.create({
        data: {
          organizationId: auth.organizationId,
          claseId: clase.id,
          docenteId: input.docenteId,
          metodo: "MANUAL",
          horaLlegada: instanteArgentino(fechaArgentina(ahora), input.horaLlegada),
          motivo: input.motivo,
          registradaPorId: auth.userId,
        },
        include: asistenciaInclude,
      });
    });
    return toAsistenciaDto(asistencia);
  } catch (error) {
    // Perdió la carrera contra otro registro: se informa la asistencia que ganó.
    throw (await errorClaseConAsistencia(clase.id)) ?? error;
  }
};
