import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { registroManualSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { asistenciaSchema } from "../schemas";
import * as asistencias from "../services/asistencias";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Asistencia docente"];

export const asistenciaRoutes = new OpenAPIHono<ApiEnv>().openapi(
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
);
