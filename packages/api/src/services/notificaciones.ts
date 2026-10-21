import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@repo/db";

import { runDeferred } from "../deferred";
import { apiEnv } from "../env";
import { badRequest } from "../errors";
import type { NovedadDto } from "../schemas";

import { deliverEmail } from "./emails/outbox";
import { novedadEmail } from "./emails/templates";

const bajaInvalida = () => badRequest("El enlace para dejar de recibir correos no es válido.");

const firmar = (userId: string) =>
  createHmac("sha256", apiEnv.authSecret).update(`baja-novedades:${userId}`).digest("base64url");

// El token no vence: lo firma el servidor con el secreto de la app y solo identifica al usuario.
export const crearTokenBajaNovedades = (userId: string) =>
  `${Buffer.from(userId).toString("base64url")}.${firmar(userId)}`;

const leerTokenBajaNovedades = (token: string) => {
  const [encodedUserId, firma, ...resto] = token.split(".");
  if (!encodedUserId || !firma || resto.length > 0) throw bajaInvalida();
  const userId = Buffer.from(encodedUserId, "base64url").toString();
  const esperada = Buffer.from(firmar(userId));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    throw bajaInvalida();
  }
  return userId;
};

export const darDeBajaNovedadesPorCorreo = async (token: string) => {
  const userId = leerTokenBajaNovedades(token);
  await prisma.userProfile.updateMany({
    where: { userId },
    data: { notificarNovedadesPorCorreo: false },
  });
};

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

// Primero se registran, en una sola transacción, el correo en el outbox y la Notificación de
// todos los destinatarios: si algo se corta después, el cron reintenta lo que quedó pendiente.
const registrarNovedad = async (organizationId: string, novedad: NovedadDto) => {
  const destinatarios = await buscarDestinatarios(organizationId, novedad.comision.id);
  const mensajes = destinatarios.map((destinatario) => ({
    organizationId,
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
      bajaUrl: `${apiEnv.appUrl}/baja-correo?token=${crearTokenBajaNovedades(destinatario.id)}`,
    }),
  }));
  return prisma.$transaction(async (tx) => {
    const correos = await tx.emailOutbox.createManyAndReturn({ data: mensajes });
    const destinatarioPorEmail = new Map(
      destinatarios.map((destinatario) => [destinatario.email, destinatario.id]),
    );
    await tx.notificacion.createMany({
      data: correos.map((correo) => ({
        organizationId,
        destinatarioId: destinatarioPorEmail.get(correo.to)!,
        tipo: "NOVEDAD" as const,
        novedadId: novedad.id,
        emailId: correo.id,
      })),
    });
    return correos;
  });
};

const enviarNovedad = async (organizationId: string, novedad: NovedadDto) => {
  for (const correo of await registrarNovedad(organizationId, novedad)) {
    await deliverEmail(correo);
  }
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
