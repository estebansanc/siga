import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  actualizarAulaSchema,
  clasesAsignablesQuerySchema,
  crearAulaSchema,
  destinosAulaQuerySchema,
  reemplazarClaseSchema,
} from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  aulaDetalleSchema,
  aulaGestionSchema,
  aulaSchema,
  aulasDisponiblesQuerySchema,
  aulasGestionQuerySchema,
  idParamSchema,
  clasesSinAulaSchema,
  planoAulaSchema,
  reemplazoAulaSchema,
} from "../schemas";
import * as acciones from "../services/acciones-plano-aulas";
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
      path: "/destinos",
      tags,
      summary: "Aulas a las que se puede mover una clase (Bedel y Autoridad)",
      description:
        "Aulas Disponibles, libres en la franja de la clase y con capacidad para los estudiantes de su comisión, sin la que ya ocupa. Ordenadas por edificio, piso y código.",
      request: { query: destinosAulaQuerySchema },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(z.array(aulaSchema), "Aulas de destino"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await acciones.listarAulasDestinoDeClase(c.get("auth"), c.req.valid("query").claseId),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}/clases-asignables",
      tags,
      summary: "Clases de hoy sin aula que se pueden asignar al aula (Bedel y Autoridad)",
      description:
        "Clases presenciales de hoy sin aula, que admiten asignación, sin solicitud pendiente, con los estudiantes de su comisión dentro de la capacidad y la franja libre en el aula. Con `reemplazo=true` la clase en curso del aula no cuenta como ocupación (se va a otra aula). Vacío si el aula no está Disponible.",
      request: { params: idParamSchema, query: clasesAsignablesQuerySchema },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(clasesSinAulaSchema, "Clases asignables"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await acciones.listarClasesAsignablesAlAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("query").reemplazo,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reemplazar-clase",
      tags,
      summary: "Reemplazar la clase en curso del aula (Bedel y Autoridad)",
      description:
        "La clase en curso pasa a `aulaDestinoId` (Cambio de aula y correo de reasignación) y `claseId`, sin aula, ocupa este aula (correo de asignación). Todo o nada. 409 si algún aula ya está asignada en esa franja (nombra la comisión); 422 si el aula no tiene clase en curso o una clase ya no admite asignación.",
      request: { params: idParamSchema, body: jsonBody(reemplazarClaseSchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(reemplazoAulaSchema, "Clases reubicadas"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await acciones.reemplazarClaseDeAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
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
