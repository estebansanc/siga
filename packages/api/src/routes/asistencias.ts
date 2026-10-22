import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { registroManualSchema, registroQrSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { clientIp } from "../middleware";
import { asistenciaSchema, registroQrResultadoSchema } from "../schemas";
import * as asistencias from "../services/asistencias";
import { consumeRateLimit } from "../services/rate-limit";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Asistencia docente"];

const intentosPorMinuto = 20;

export const asistenciaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "post",
      path: "/manual",
      tags,
      summary: "Registrar a mano la asistencia de un docente",
      description:
        "Solo Bedel. Guarda la asistencia con método Manual, hora de llegada, motivo y Bedel responsable, y pasa la clase a Docente presente, todo o nada. 409 si la clase ya tiene asistencia (QR o manual); 422 si la clase no es de hoy, no está Programada o Demorada, el docente no es de la comisión o la hora de llegada es futura.",
      request: { body: jsonBody(registroManualSchema) },
      responses: { 201: jsonResponse(asistenciaSchema, "Asistencia"), ...commonErrors },
    }),
    async (c) =>
      c.json(await asistencias.registrarAsistenciaManual(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/qr",
      tags,
      summary: "Registrar la asistencia escaneando el QR del aula",
      description:
        "Solo Docente. Valida firma y vigencia del código, la clase presencial Programada o Demorada del docente en ese aula, fecha y turno (la en curso o, si ninguna lo está, la próxima) y la presencia: ubicación dentro del radio configurado o, si no, red institucional. Guarda la asistencia con método QR y pasa la clase a Docente presente, todo o nada; las coordenadas no se guardan. 201 si registró; 200 con `yaRegistrada` si la clase ya tenía asistencia (QR o manual). 422 por código inválido, vencido o ya usado, sin clase en el aula y turno o fuera de la institución; 429 `ATTEMPTS_BLOCKED` tras 10 fallos en 15 minutos (bloqueo de 15 minutos por usuario) y `RATE_LIMITED` por exceso de pedidos.",
      request: { body: jsonBody(registroQrSchema) },
      responses: {
        200: jsonResponse(registroQrResultadoSchema, "Asistencia ya registrada"),
        201: jsonResponse(registroQrResultadoSchema, "Asistencia registrada"),
        ...commonErrors,
      },
    }),
    async (c) => {
      const auth = c.get("auth");
      await consumeRateLimit(`${auth.userId}|asistencia-qr`, intentosPorMinuto, 60);
      const { resultado, creada } = await asistencias.registrarAsistenciaQr(
        auth,
        c.req.valid("json"),
        clientIp(c.req.raw.headers),
      );
      return creada ? c.json(resultado, 201) : c.json(resultado, 200);
    },
  );
