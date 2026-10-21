import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { listarNovedadesQuerySchema, publicarNovedadSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { idParamSchema, novedadSchema } from "../schemas";
import * as novedades from "../services/novedades";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Novedades"];

export const novedadRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Novedades publicadas, la más reciente primero",
      description: "El docente ve las de sus comisiones; bedel y autoridad, todas.",
      request: { query: listarNovedadesQuerySchema },
      middleware: [perfilOnly("DOCENTE", "BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(z.array(novedadSchema), "Novedades"), ...commonErrors },
    }),
    async (c) => c.json(await novedades.listarNovedades(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Publicar una novedad sobre una o más clases de una comisión",
      description:
        "Docente sobre sus comisiones, bedel sobre cualquiera. Cambia el estado de las clases según el tipo; Cambio de aula reserva el aula nueva (409 si ya está asignada en esa franja).",
      request: { body: jsonBody(publicarNovedadSchema) },
      middleware: [perfilOnly("DOCENTE", "BEDEL")] as const,
      responses: { 201: jsonResponse(novedadSchema, "Novedad publicada"), ...commonErrors },
    }),
    async (c) => c.json(await novedades.publicarNovedad(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/finalizar",
      tags,
      summary: "Dar por finalizada una novedad",
      description:
        "Demora y Virtual devuelven la clase a Programada; Cambio de aula restituye el aula anterior si sigue libre. Ausencia y Suspensión no se finalizan (422).",
      request: { params: idParamSchema },
      middleware: [perfilOnly("DOCENTE", "BEDEL")] as const,
      responses: { 200: jsonResponse(novedadSchema, "Novedad finalizada"), ...commonErrors },
    }),
    async (c) =>
      c.json(await novedades.finalizarNovedad(c.get("auth"), c.req.valid("param").id), 200),
  );
