import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { buscarComisionesQuerySchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  carreraSchema,
  comisionSchema,
  generacionClasesSchema,
  generarClasesBodySchema,
  materiaSchema,
  materiasQuerySchema,
} from "../schemas";
import * as datosAcademicos from "../services/datos-academicos";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Datos académicos"];

export const carreraRoutes = new OpenAPIHono<ApiEnv>().openapi(
  createRoute({
    method: "get",
    path: "/",
    tags,
    summary: "Carreras activas",
    responses: { 200: jsonResponse(z.array(carreraSchema), "Carreras"), ...commonErrors },
  }),
  async (c) => c.json(await datosAcademicos.listarCarreras(c.get("auth").organizationId), 200),
);

export const materiaRoutes = new OpenAPIHono<ApiEnv>().openapi(
  createRoute({
    method: "get",
    path: "/",
    tags,
    summary: "Materias activas, filtrables por carrera y año",
    request: { query: materiasQuerySchema },
    responses: { 200: jsonResponse(z.array(materiaSchema), "Materias"), ...commonErrors },
  }),
  async (c) =>
    c.json(
      await datosAcademicos.listarMaterias(c.get("auth").organizationId, c.req.valid("query")),
      200,
    ),
);

export const comisionRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Buscar comisiones activas por carrera, año y materia",
      request: { query: buscarComisionesQuerySchema },
      responses: { 200: jsonResponse(z.array(comisionSchema), "Comisiones"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.buscarComisiones(c.get("auth").organizationId, c.req.valid("query")),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/generar-clases",
      tags,
      summary: "Generar las clases programadas de un período o de una comisión",
      description:
        "Una clase por horario y fecha del período, sin días no laborables; las que ya existen se conservan y las que no consiguen aula quedan sin aula.",
      request: { body: jsonBody(generarClasesBodySchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: {
        200: jsonResponse(generacionClasesSchema, "Resumen de la generación"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await datosAcademicos.generarClases(c.get("auth"), c.req.valid("json")), 200),
  );
