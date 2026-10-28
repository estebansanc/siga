import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { actualizarAulaSchema, crearAulaSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  aulaDetalleSchema,
  aulaGestionSchema,
  aulaSchema,
  aulasDisponiblesQuerySchema,
  aulasGestionQuerySchema,
  idParamSchema,
  planoAulaSchema,
} from "../schemas";
import * as aulas from "../services/aulas";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Aulas"];

export const aulaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
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
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/plano",
      tags,
      summary: "Plano de aulas: estado en tiempo real de cada aula activa",
      description:
        "Los cuatro perfiles. `estado` es Libre, Pendiente, Ocupada o el estado del aula si no está Disponible; incluye la clase en curso o la próxima del día. Ordenado por edificio, piso y código.",
      responses: {
        200: jsonResponse(z.array(planoAulaSchema), "Aulas del plano"),
        ...commonErrors,
      },
    }),
    async (c) => c.json(await aulas.listarPlanoAulas(c.get("auth").organizationId), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Aulas con estado y ocupación en tiempo real",
      description:
        "Solo Bedel. Las activas, o con `bajas=true` las dadas de baja. `ocupada` se calcula con las clases en curso.",
      request: { query: aulasGestionQuerySchema },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(z.array(aulaGestionSchema), "Aulas"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await aulas.listarAulasGestion(c.get("auth").organizationId, c.req.valid("query").bajas),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta un aula",
      description: "Solo Bedel. 409 si el código ya existe; 422 ante datos inválidos.",
      request: { body: jsonBody(crearAulaSchema) },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 201: jsonResponse(aulaGestionSchema, "Aula creada"), ...commonErrors },
    }),
    async (c) =>
      c.json(await aulas.crearAula(c.get("auth").organizationId, c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      tags,
      summary: "Detalle de un aula con sus clases de hoy y los próximos 7 días",
      description:
        "Solo Bedel. `clasesAfectadas` lista las clases sin terminar asignadas al aula, para advertir antes de sacarla de servicio o darla de baja.",
      request: { params: idParamSchema },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(aulaDetalleSchema, "Aula"), ...commonErrors },
    }),
    async (c) =>
      c.json(await aulas.obtenerAula(c.get("auth").organizationId, c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar un aula",
      description:
        "Solo Bedel. Ocupada no es un estado editable. Las clases afectadas conservan el aula: reasignarlas es otra operación. 409 si el código ya existe.",
      request: { params: idParamSchema, body: jsonBody(actualizarAulaSchema) },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(aulaGestionSchema, "Aula actualizada"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await aulas.actualizarAula(
          c.get("auth").organizationId,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja un aula",
      description: "Solo Bedel. Baja lógica: el código queda reservado y se puede reactivar.",
      request: { params: idParamSchema },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(aulaGestionSchema, "Aula dada de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await aulas.darDeBajaAula(c.get("auth").organizationId, c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar un aula dada de baja",
      description: "Solo Bedel.",
      request: { params: idParamSchema },
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(aulaGestionSchema, "Aula reactivada"), ...commonErrors },
    }),
    async (c) =>
      c.json(await aulas.reactivarAula(c.get("auth").organizationId, c.req.valid("param").id), 200),
  );
