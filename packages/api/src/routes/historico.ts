import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { consultaNovedadesSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { consultaNovedadesResultadoSchema, opcionesHistoricoSchema } from "../schemas";
import * as historico from "../services/historico";

import { commonErrors, jsonResponse } from "./shared";

const tags = ["Consultas históricas"];

// Sin `perfilOnly`: el servicio rechaza y audita el acceso denegado (SEG-6).
export const historicoRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/novedades",
      tags,
      summary: "Novedades publicadas en un rango de fechas, con indicadores por tipo",
      description:
        "Solo Autoridad académica. `desde` y `hasta` son obligatorios (yyyy-mm-dd, hora argentina, inclusivos, hasta 12 meses) y filtran por fecha de publicación; los filtros opcionales se combinan. Los indicadores cuentan todo el período filtrado; el detalle pagina de a 20, la más reciente primero.",
      request: { query: consultaNovedadesSchema },
      responses: {
        200: jsonResponse(consultaNovedadesResultadoSchema, "Indicadores y detalle"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await historico.consultarNovedades(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/opciones",
      tags,
      summary: "Docentes y aulas para los filtros de las consultas históricas",
      description: "Solo Autoridad académica.",
      responses: { 200: jsonResponse(opcionesHistoricoSchema, "Opciones"), ...commonErrors },
    }),
    async (c) => c.json(await historico.opcionesHistorico(c.get("auth")), 200),
  );
