import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { consultaAsistenciasSchema, consultaNovedadesSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import {
  consultaAsistenciasResultadoSchema,
  consultaNovedadesResultadoSchema,
  opcionesHistoricoSchema,
} from "../schemas";
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
      path: "/asistencias",
      tags,
      summary: "Asistencia docente en un rango de fechas, con indicadores",
      description:
        "Autoridad académica y Bedel. `desde` y `hasta` son obligatorios (yyyy-mm-dd, hora argentina, inclusivos, hasta 12 meses) y filtran por la fecha de la clase; los filtros opcionales se combinan. Los indicadores cuentan todo el período filtrado; el detalle pagina de a 20, el registro más reciente primero.",
      request: { query: consultaAsistenciasSchema },
      responses: {
        200: jsonResponse(consultaAsistenciasResultadoSchema, "Indicadores y detalle"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await historico.consultarAsistencias(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/opciones",
      tags,
      summary: "Docentes y aulas para los filtros de las consultas históricas",
      description: "Autoridad académica y Bedel.",
      responses: { 200: jsonResponse(opcionesHistoricoSchema, "Opciones"), ...commonErrors },
    }),
    async (c) => c.json(await historico.opcionesHistorico(c.get("auth")), 200),
  );
