import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { cambiarEstadoInstitucionalSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { cambioEstadoInstitucionalSchema, estadoInstitucionalSchema } from "../schemas";
import * as estadoInstitucional from "../services/estado-institucional";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Estado institucional"];

export const estadoInstitucionalRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Estado institucional vigente",
      description: "Abierta, Cerrada o Abierta con novedades, con motivo, vigencia y responsable.",
      responses: {
        200: jsonResponse(estadoInstitucionalSchema, "Estado vigente"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await estadoInstitucional.obtenerEstadoActual(c.get("auth").organizationId), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/historial",
      tags,
      summary: "Historial de cambios de estado, el más reciente primero",
      responses: {
        200: jsonResponse(z.array(estadoInstitucionalSchema), "Historial"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await estadoInstitucional.listarHistorial(c.get("auth").organizationId), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Registrar un cambio de estado institucional",
      description:
        "Solo Bedel. El motivo es obligatorio salvo para Abierta; 422 si el estado coincide con el vigente. Al cerrar, las clases de la ventana de cierre pasan a Suspendida.",
      request: { body: jsonBody(cambiarEstadoInstitucionalSchema) },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: {
        201: jsonResponse(cambioEstadoInstitucionalSchema, "Estado registrado"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await estadoInstitucional.cambiarEstado(c.get("auth"), c.req.valid("json")), 201),
  );
