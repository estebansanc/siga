import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { listarClasesQuerySchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { claseSchema, clasesDelDiaSchema, idParamSchema } from "../schemas";
import * as clases from "../services/clases";

import { commonErrors, jsonResponse } from "./shared";

const tags = ["Clases"];

export const claseRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Clases programadas de un día, con estado y novedades activas",
      description:
        "Por defecto hoy y el ámbito `mias` (comisiones seguidas del estudiante o dictadas por el docente; bedel y autoridad ven todas). Filtros combinables: carrera, año, materia, comisión y fecha.",
      request: { query: listarClasesQuerySchema },
      responses: { 200: jsonResponse(clasesDelDiaSchema, "Clases del día"), ...commonErrors },
    }),
    async (c) => c.json(await clases.listarClases(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      tags,
      summary: "Detalle de una clase con el historial de novedades del día",
      request: { params: idParamSchema },
      responses: { 200: jsonResponse(claseSchema, "Clase"), ...commonErrors },
    }),
    async (c) => c.json(await clases.obtenerClase(c.get("auth"), c.req.valid("param").id), 200),
  );
