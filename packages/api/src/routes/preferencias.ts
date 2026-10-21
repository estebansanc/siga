import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { actualizarPreferenciasSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { preferenciasSchema } from "../schemas";
import * as preferencias from "../services/preferencias";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Preferencias"];

export const preferenciaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Comisiones que sigue el estudiante",
      middleware: [perfilOnly("ESTUDIANTE")] as const,
      responses: { 200: jsonResponse(preferenciasSchema, "Preferencias"), ...commonErrors },
    }),
    async (c) => c.json(await preferencias.obtenerPreferencias(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      tags,
      summary: "Reemplazar las comisiones seguidas",
      request: { body: jsonBody(actualizarPreferenciasSchema) },
      middleware: [perfilOnly("ESTUDIANTE")] as const,
      responses: {
        200: jsonResponse(preferenciasSchema, "Preferencias guardadas"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await preferencias.actualizarPreferencias(c.get("auth"), c.req.valid("json")), 200),
  );
