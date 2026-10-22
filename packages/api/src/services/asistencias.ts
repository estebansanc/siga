import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, type Prisma } from "@repo/db";
import {
  bloqueoIntentosMinutos,
  elegirClaseDeRegistro,
  esHoraFutura,
  fechaArgentina,
  horaArgentina,
  instanteArgentino,
  intentosFallidosMax,
  ipEnAlgunaRed,
  metodoAsistenciaLabels,
  rangoDeTurno,
  ubicacionDentroDelRadio,
  ventanaIntentosMinutos,
  type MetodoAsistencia,
  type RegistroManualInput,
  type RegistroQrInput,
  type ValidacionPresencia,
} from "@repo/domain";

import { ApiError, conflict, notFound, unprocessable } from "../errors";
import type { AsistenciaDto, RegistroQrResultadoDto } from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { asistenciaInclude, finalizarClasesVencidas, toAsistenciaDto } from "./clases";
import { assertPerfil } from "./permisos";
import { buscarSesionVigente } from "./qr";
import { obtenerPresencia, obtenerTurnos } from "./settings";

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

type NuevaAsistencia = Pick<
  Prisma.AsistenciaDocenteUncheckedCreateInput,
  | "docenteId"
  | "metodo"
  | "horaLlegada"
  | "motivo"
  | "validacion"
  | "sesionQrId"
  | "registradaPorId"
>;

// Todo o nada: la asistencia (única por clase), el paso a Docente presente y la auditoría van en
// una transacción. Es el camino común del registro manual y del registro por QR.
const persistirAsistencia = (auth: AuthContext, claseId: string, datos: NuevaAsistencia) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.claseProgramada.updateMany({
      where: { id: claseId, estado: { in: [...estadosConAsistenciaPendiente] } },
      data: { estado: "DOCENTE_PRESENTE" },
    });
    if (count === 0) throw unprocessable("La clase cambió de estado: volvé a intentarlo");
    await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "docente_presente", {
      claseIds: [claseId],
      metodo: datos.metodo,
    });
    return tx.asistenciaDocente.create({
      data: { organizationId: auth.organizationId, claseId, ...datos },
      include: asistenciaInclude,
    });
  });

// RF-18: contingencia del Bedel cuando el docente no puede usar el QR.
export const registrarAsistenciaManual = async (
  auth: AuthContext,
  input: RegistroManualInput,
  ahora = new Date(),
): Promise<AsistenciaDto> => {
  await assertPerfil(auth, "BEDEL");
  await finalizarClasesVencidas(auth.organizationId, ahora);
  const clase = await buscarClaseElegible(auth, input, ahora);

  try {
    const asistencia = await persistirAsistencia(auth, clase.id, {
      docenteId: input.docenteId,
      metodo: "MANUAL",
      horaLlegada: instanteArgentino(fechaArgentina(ahora), input.horaLlegada),
      motivo: input.motivo,
      registradaPorId: auth.userId,
    });
    return toAsistenciaDto(asistencia);
  } catch (error) {
    // Perdió la carrera contra otro registro: se informa la asistencia que ganó.
    throw (await errorClaseConAsistencia(clase.id)) ?? error;
  }
};

const errorCodigoInvalido =
  "El código QR no es válido o ya venció. Pedí a bedelía que lo muestre de nuevo.";
const errorSinClase = "No tenés una clase en esta aula y turno.";
const errorFueraDeLaInstitucion =
  "No pudimos confirmar que estés en la institución. Pedí el registro manual al bedel.";
const errorSinUbicacion =
  "No pudimos obtener tu ubicación ni confirmar la red institucional. Habilitá el permiso de ubicación o pedí el registro manual al bedel.";

const bloqueoPorIntentos = (liberaEn: Date) =>
  new ApiError(
    429,
    "ATTEMPTS_BLOCKED",
    `Superaste los ${intentosFallidosMax} intentos fallidos. No podés volver a escanear hasta que pasen ${bloqueoIntentosMinutos} minutos: se libera a las ${horaArgentina(liberaEn)}.`,
  );

// SEG-9: por usuario y no por IP, que en la institución se comparte. Se bloquea cuando en los
// 15 minutos que terminan en el último fallo hubo 10; el bloqueo dura 15 minutos desde ese
// último fallo (un intento bloqueado no suma otro).
const bloqueoVigente = async (auth: AuthContext, ahora: Date) => {
  const propios = { userId: auth.userId, organizationId: auth.organizationId };
  const ultimo = await prisma.intentoAsistenciaFallido.findFirst({
    where: propios,
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!ultimo) return null;
  const liberaEn = new Date(ultimo.createdAt.getTime() + bloqueoIntentosMinutos * 60_000);
  if (liberaEn <= ahora) return null;
  const desde = new Date(ultimo.createdAt.getTime() - ventanaIntentosMinutos * 60_000);
  const enLaVentana = await prisma.intentoAsistenciaFallido.count({
    where: { ...propios, createdAt: { gt: desde, lte: ultimo.createdAt } },
  });
  return enLaVentana >= intentosFallidosMax ? bloqueoPorIntentos(liberaEn) : null;
};

export const purgarIntentosFallidos = async (ahora = new Date()) => {
  const umbral = new Date(
    ahora.getTime() - (ventanaIntentosMinutos + bloqueoIntentosMinutos) * 60_000,
  );
  const { count } = await prisma.intentoAsistenciaFallido.deleteMany({
    where: { createdAt: { lt: umbral } },
  });
  return count;
};

const rechazarIntento = async (auth: AuthContext, motivo: string, mensaje: string, ahora: Date) => {
  await prisma.intentoAsistenciaFallido.create({
    data: { organizationId: auth.organizationId, userId: auth.userId, motivo, createdAt: ahora },
  });
  return (await bloqueoVigente(auth, ahora)) ?? unprocessable(mensaje);
};

const estadosElegiblesPorQr = [...estadosConAsistenciaPendiente, "DOCENTE_PRESENTE"] as const;

const clasesDelDocenteEnLaSesion = async (
  auth: AuthContext,
  sesion: NonNullable<Awaited<ReturnType<typeof buscarSesionVigente>>>,
) => {
  const turnos = await obtenerTurnos(auth.organizationId);
  const { desde, hasta } = rangoDeTurno(turnos, sesion.turno, fromDateColumn(sesion.fecha));
  return prisma.claseProgramada.findMany({
    where: {
      organizationId: auth.organizationId,
      aulaId: sesion.aulaId,
      fecha: sesion.fecha,
      modalidad: "PRESENCIAL",
      estado: { in: [...estadosElegiblesPorQr] },
      inicio: { lt: hasta },
      fin: { gt: desde },
      comision: { activa: true, docentes: { some: { docenteId: auth.userId } } },
    },
    include: { asistencia: { include: asistenciaInclude } },
  });
};

const validarPresencia = async (
  auth: AuthContext,
  input: RegistroQrInput,
  ip: string,
): Promise<ValidacionPresencia | null> => {
  const sede = await obtenerPresencia(auth.organizationId);
  if (input.ubicacion && ubicacionDentroDelRadio(input.ubicacion, sede)) return "UBICACION";
  return ipEnAlgunaRed(ip, sede.redes) ? "RED" : null;
};

// RF-04: el docente escanea el QR del aula. Se valida el código, su clase y su presencia (sin
// guardar coordenadas) y se registra por el mismo camino que el manual, con método QR.
export const registrarAsistenciaQr = async (
  auth: AuthContext,
  input: RegistroQrInput,
  ip: string,
  ahora = new Date(),
): Promise<{ resultado: RegistroQrResultadoDto; creada: boolean }> => {
  await assertPerfil(auth, "DOCENTE");
  const bloqueo = await bloqueoVigente(auth, ahora);
  if (bloqueo) throw bloqueo;

  const sesion = await buscarSesionVigente(auth.organizationId, input.token, ahora);
  if (!sesion) throw await rechazarIntento(auth, "codigo_invalido", errorCodigoInvalido, ahora);
  const yaUsado = await prisma.asistenciaDocente.findFirst({
    where: { sesionQrId: sesion.id, docenteId: auth.userId },
    select: { id: true },
  });
  if (yaUsado) throw await rechazarIntento(auth, "codigo_usado", errorCodigoInvalido, ahora);

  if (fromDateColumn(sesion.fecha) !== fechaArgentina(ahora)) {
    throw await rechazarIntento(auth, "codigo_de_otra_fecha", errorCodigoInvalido, ahora);
  }

  await finalizarClasesVencidas(auth.organizationId, ahora);
  const clase = elegirClaseDeRegistro(await clasesDelDocenteEnLaSesion(auth, sesion), ahora);
  if (!clase) throw await rechazarIntento(auth, "sin_clase", errorSinClase, ahora);

  const resumen = { aula: sesion.aula, turno: sesion.turno };
  if (clase.asistencia) {
    const asistencia = toAsistenciaDto(clase.asistencia);
    return {
      resultado: { asistencia, yaRegistrada: true, validacion: null, ...resumen },
      creada: false,
    };
  }

  const validacion = await validarPresencia(auth, input, ip);
  if (!validacion) {
    const sinUbicacion = !input.ubicacion;
    throw await rechazarIntento(
      auth,
      sinUbicacion ? "sin_ubicacion" : "fuera_de_la_institucion",
      sinUbicacion ? errorSinUbicacion : errorFueraDeLaInstitucion,
      ahora,
    );
  }

  try {
    const asistencia = await persistirAsistencia(auth, clase.id, {
      docenteId: auth.userId,
      metodo: "QR",
      horaLlegada: ahora,
      validacion,
      sesionQrId: sesion.id,
      registradaPorId: auth.userId,
    });
    const dto = toAsistenciaDto(asistencia);
    return {
      resultado: { asistencia: dto, yaRegistrada: false, validacion, ...resumen },
      creada: true,
    };
  } catch (error) {
    // Otro registro de la misma clase ganó la carrera: se informa el que quedó.
    const existente = await prisma.asistenciaDocente.findUnique({
      where: { claseId: clase.id },
      include: asistenciaInclude,
    });
    if (!existente) throw error;
    const asistencia = toAsistenciaDto(existente);
    return {
      resultado: { asistencia, yaRegistrada: true, validacion: null, ...resumen },
      creada: false,
    };
  }
};
