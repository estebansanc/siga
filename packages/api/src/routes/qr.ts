import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { clasesDelTurnoQuerySchema, generarQrSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { clasesDelTurnoSchema, sesionQrSchema } from "../schemas";
import * as qr from "../services/qr";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["QR de asistencia"];

export const qrRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "post",
      path: "/sesiones",
      tags,
      summary: "Generar un código QR de asistencia para un aula, turno y fecha",
      description:
        "Solo Bedel. Cada llamada emite un código nuevo y lo registra como Sesión de QR. Vence a los 60 s o al fin del turno, lo primero. 422 si la institución está Cerrada, la fecha o el turno ya pasaron o el aula no tiene clases presenciales en el turno.",
      request: { body: jsonBody(generarQrSchema) },
      responses: { 201: jsonResponse(sesionQrSchema, "Sesión de QR"), ...commonErrors },
    }),
    async (c) => c.json(await qr.generarQr(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/clases",
      tags,
      summary: "Clases del aula en un turno",
      description:
        "Solo Bedel. Clases presenciales, no suspendidas ni finalizadas, de la fecha, cuya franja se superpone con el turno.",
      request: { query: clasesDelTurnoQuerySchema },
      responses: { 200: jsonResponse(clasesDelTurnoSchema, "Clases del turno"), ...commonErrors },
    }),
    async (c) => c.json(await qr.listarClasesDelTurno(c.get("auth"), c.req.valid("query")), 200),
  );
