import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma, type EmailOutbox } from "@repo/db";

import { runDeferred } from "../deferred";
import { apiEnv } from "../env";
import { badRequest } from "../errors";
import type { NovedadDto } from "../schemas";

import { deliverEmail } from "./emails/outbox";
import { novedadEmail } from "./emails/templates";

const bajaInvalida = () => badRequest("El enlace para dejar de recibir correos no es válido.");

export type TipoBajaCorreo = "novedades" | "avisos";

const esTipoBaja = (valor: string): valor is TipoBajaCorreo =>
  valor === "novedades" || valor === "avisos";

const firmar = (tipo: TipoBajaCorreo, userId: string) =>
  createHmac("sha256", apiEnv.authSecret).update(`baja-${tipo}:${userId}`).digest("base64url");

// El token no vence: lo firma el servidor con el secreto de la app e identifica al usuario y
// qué correo deja de recibir.
export const crearTokenBaja = (tipo: TipoBajaCorreo, userId: string) =>
  `${tipo}.${Buffer.from(userId).toString("base64url")}.${firmar(tipo, userId)}`;

export const crearTokenBajaNovedades = (userId: string) => crearTokenBaja("novedades", userId);
export const crearTokenBajaAvisos = (userId: string) => crearTokenBaja("avisos", userId);

const leerTokenBaja = (token: string) => {
  const [tipo, encodedUserId, firma, ...resto] = token.split(".");
  if (!tipo || !encodedUserId || !firma || resto.length > 0) throw bajaInvalida();
  if (!esTipoBaja(tipo)) throw bajaInvalida();
  const userId = Buffer.from(encodedUserId, "base64url").toString();
  const esperada = Buffer.from(firmar(tipo, userId));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    throw bajaInvalida();
  }
  return { tipo, userId };
};

const campoDeBaja = {
  novedades: "notificarNovedadesPorCorreo",
  avisos: "notificarAvisosPorCorreo",
} as const;

export const darDeBajaPorCorreo = async (token: string) => {
  const { tipo, userId } = leerTokenBaja(token);
  await prisma.userProfile.updateMany({ where: { userId }, data: { [campoDeBaja[tipo]]: false } });
  return tipo;
};

export const urlDeBaja = (token: string) => `${apiEnv.appUrl}/baja-correo?token=${token}`;

const buscarDestinatarios = (organizationId: string, comisionId: string) =>
  prisma.user.findMany({
    where: {
      comisionesSeguidas: { some: { comisionId } },
      profile: {
        organizationId,
        perfil: "ESTUDIANTE",
        activo: true,
        notificarNovedadesPorCorreo: true,
      },
    },
    select: { id: true, email: true },
  });

type EnvioPendiente = { destinatarioId: string; to: string; subject: string; html: string };
type OrigenDelEnvio = { tipo: "NOVEDAD"; novedadId: string } | { tipo: "AVISO"; avisoId: string };

// Primero se registran, en una sola transacción, el correo en el outbox y la Notificación de
// todos los destinatarios: si algo se corta después, el cron reintenta lo que quedó pendiente.
export const registrarEnvios = (
  organizationId: string,
  envios: EnvioPendiente[],
  origen: OrigenDelEnvio,
) =>
  prisma.$transaction(async (tx) => {
    const correos = await tx.emailOutbox.createManyAndReturn({
      data: envios.map(({ to, subject, html }) => ({ organizationId, to, subject, html })),
    });
    const destinatarioPorEmail = new Map(envios.map((envio) => [envio.to, envio.destinatarioId]));
    await tx.notificacion.createMany({
      data: correos.map((correo) => ({
        organizationId,
        destinatarioId: destinatarioDe(destinatarioPorEmail, correo.to),
        emailId: correo.id,
        ...origen,
      })),
    });
    return correos;
  });

const destinatarioDe = (destinatarioPorEmail: Map<string, string>, email: string) => {
  const destinatarioId = destinatarioPorEmail.get(email);
  if (!destinatarioId) throw new Error(`El correo a ${email} no tiene destinatario`);
  return destinatarioId;
};

export const enviarCorreos = async (correos: EmailOutbox[]) => {
  for (const correo of correos) await deliverEmail(correo);
};

const enviarNovedad = async (organizationId: string, novedad: NovedadDto) => {
  const destinatarios = await buscarDestinatarios(organizationId, novedad.comision.id);
  const envios = destinatarios.map((destinatario) => ({
    destinatarioId: destinatario.id,
    to: destinatario.email,
    ...novedadEmail({
      materia: novedad.comision.materia,
      comision: novedad.comision.codigo,
      tipo: novedad.tipo,
      clases: novedad.clases,
      minutosDemora: novedad.minutosDemora,
      enlaceVirtual: novedad.enlaceVirtual,
      aulaNueva: novedad.aulaNueva?.codigo ?? null,
      mensaje: novedad.mensaje,
      publicadaPorBedelia: novedad.publicadaPorBedelia,
      clasesUrl: `${apiEnv.appUrl}/clases`,
      bajaUrl: urlDeBaja(crearTokenBajaNovedades(destinatario.id)),
    }),
  }));
  const correos = await registrarEnvios(organizationId, envios, {
    tipo: "NOVEDAD",
    novedadId: novedad.id,
  });
  await enviarCorreos(correos);
};

// Un correo por novedad y por estudiante que sigue la comisión con la opción activa. Un fallo
// acá no deshace la publicación: el envío fallido queda en el outbox y el cron lo reintenta.
export const notificarNovedadPublicada = async (organizationId: string, novedad: NovedadDto) => {
  await runDeferred("notificar-novedad", async () => {
    try {
      await enviarNovedad(organizationId, novedad);
    } catch (error) {
      console.error(error);
    }
  });
};
