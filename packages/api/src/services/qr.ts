import { createHmac, randomUUID } from "node:crypto";

import type { AuthContext } from "@repo/auth";
import { prisma, toDateColumn } from "@repo/db";
import {
  fechaArgentina,
  qrVigenciaSegundos,
  rangoDeTurno,
  type ClasesDelTurnoQuery,
  type GenerarQrInput,
} from "@repo/domain";

import { apiEnv } from "../env";
import { notFound, unavailable, unprocessable } from "../errors";
import type { ClaseDto, SesionQrDto } from "../schemas";
import { toIso } from "../serializers";

import { claseInclude, finalizarClasesVencidas, toClaseDto } from "./clases";
import { obtenerEstadoActual } from "./estado-institucional";
import { assertPerfil } from "./permisos";
import { obtenerTurnos } from "./settings";

const base64Url = (value: string) => Buffer.from(value).toString("base64url");

const firmar = (contenido: string) => {
  if (!apiEnv.authSecret) throw unavailable("La firma de códigos QR no está configurada");
  return createHmac("sha256", apiEnv.authSecret).update(contenido).digest("base64url");
};

// El token lleva la sesión, el aula, la fecha, el turno y el vencimiento, firmados: RF-04
// verifica la firma y lo compara con la sesión guardada.
const firmarToken = (payload: Record<string, string | number>) => {
  const contenido = base64Url(JSON.stringify(payload));
  return `${contenido}.${firmar(contenido)}`;
};

const estadosSinPresencia = ["SUSPENDIDA", "FINALIZADA"] as const;

const buscarAula = async (organizationId: string, aulaId: string) => {
  const aula = await prisma.aula.findFirst({
    where: { id: aulaId, organizationId },
    select: { id: true, codigo: true, edificio: true, piso: true },
  });
  if (!aula) throw notFound("Aula");
  return aula;
};

const clasesDelTurno = async (
  organizationId: string,
  { aulaId, turno, fecha }: ClasesDelTurnoQuery,
): Promise<ClaseDto[]> => {
  const turnos = await obtenerTurnos(organizationId);
  const { desde, hasta } = rangoDeTurno(turnos, turno, fecha);
  const clases = await prisma.claseProgramada.findMany({
    where: {
      organizationId,
      aulaId,
      fecha: toDateColumn(fecha),
      modalidad: "PRESENCIAL",
      estado: { notIn: [...estadosSinPresencia] },
      inicio: { lt: hasta },
      fin: { gt: desde },
      comision: { activa: true },
    },
    include: claseInclude,
    orderBy: { inicio: "asc" },
  });
  return clases.map(toClaseDto);
};

// RF-03: las clases presenciales vigentes del aula cuya franja se superpone con el turno.
export const listarClasesDelTurno = async (
  auth: AuthContext,
  query: ClasesDelTurnoQuery,
): Promise<ClaseDto[]> => {
  await assertPerfil(auth, "BEDEL");
  await buscarAula(auth.organizationId, query.aulaId);
  await finalizarClasesVencidas(auth.organizationId);
  return clasesDelTurno(auth.organizationId, query);
};

const assertInstitucionAbierta = async (organizationId: string, ahora: Date) => {
  const estado = await obtenerEstadoActual(organizationId);
  const vigente = !estado.vigenciaHasta || new Date(estado.vigenciaHasta) > ahora;
  if (estado.estado === "CERRADA" && vigente) {
    throw unprocessable("La institución está cerrada: no se puede generar el QR");
  }
};

// RF-03 / SEG-5: cada llamada emite un código nuevo y lo guarda como Sesión de QR (la
// auditoría registra fecha, hora y bedel). Vence a los 60 s o al fin del turno, lo primero.
export const generarQr = async (
  auth: AuthContext,
  input: GenerarQrInput,
  ahora = new Date(),
): Promise<SesionQrDto> => {
  await assertPerfil(auth, "BEDEL");
  const aula = await buscarAula(auth.organizationId, input.aulaId);
  await assertInstitucionAbierta(auth.organizationId, ahora);

  if (input.fecha < fechaArgentina(ahora)) throw unprocessable("La fecha ya pasó");
  const turnos = await obtenerTurnos(auth.organizationId);
  const { desde: turnoInicio, hasta: turnoFin } = rangoDeTurno(turnos, input.turno, input.fecha);
  if (turnoFin <= ahora) throw unprocessable("El turno ya terminó");

  await finalizarClasesVencidas(auth.organizationId, ahora);
  const clases = await clasesDelTurno(auth.organizationId, input);
  if (clases.length === 0) throw unprocessable("El aula no tiene clases en ese turno");

  const venceEn = new Date(
    Math.min(ahora.getTime() + qrVigenciaSegundos * 1000, turnoFin.getTime()),
  );
  const id = randomUUID();
  const token = firmarToken({
    sid: id,
    aula: aula.id,
    fecha: input.fecha,
    turno: input.turno,
    exp: venceEn.getTime(),
  });
  await prisma.sesionQr.create({
    data: {
      id,
      organizationId: auth.organizationId,
      aulaId: aula.id,
      fecha: toDateColumn(input.fecha),
      turno: input.turno,
      token,
      emitidoEn: ahora,
      venceEn,
      bedelId: auth.userId,
    },
  });
  return {
    id,
    token,
    aula,
    fecha: input.fecha,
    turno: input.turno,
    turnoInicio: toIso(turnoInicio),
    turnoFin: toIso(turnoFin),
    emitidoEn: toIso(ahora),
    venceEn: toIso(venceEn),
  };
};
