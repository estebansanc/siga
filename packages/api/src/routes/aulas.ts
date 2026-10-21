import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { ApiEnv } from "../context";
import { aulaSchema, aulasDisponiblesQuerySchema } from "../schemas";
import * as aulas from "../services/aulas";

import { commonErrors, jsonResponse } from "./shared";

const tags = ["Aulas"];

export const aulaRoutes = new OpenAPIHono<ApiEnv>().openapi(
  createRoute({
    method: "get",
    path: "/disponibles",
    tags,
    summary: "Aulas libres en la franja de las clases indicadas",
    request: { query: aulasDisponiblesQuerySchema },
    responses: { 200: jsonResponse(z.array(aulaSchema), "Aulas disponibles"), ...commonErrors },
  }),
  async (c) =>
    c.json(
      await aulas.listarAulasDisponibles(
        c.get("auth").organizationId,
        c.req.valid("query").claseIds,
      ),
      200,
    ),
);
