import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  cambiarEstadoIncidenciaSchema,
  consultaIncidenciasSchema,
  crearIncidenciaSchema,
  subirFotoIncidenciaSchema,
} from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  consultaIncidenciasResultadoSchema,
  fotoSubidaSchema,
  idParamSchema,
  incidenciaDetalleSchema,
  incidenciaSchema,
} from "../schemas";
import * as incidencias from "../services/incidencias";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Incidencias"];
const reportantes = perfilOnly("DOCENTE", "BEDEL");
const soloBedel = perfilOnly("BEDEL");
const consultantes = perfilOnly("BEDEL", "AUTORIDAD");

export const incidenciaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "post",
      path: "/fotos",
      tags,
      summary: "URL firmada para subir la foto de una incidencia",
      description:
        "Docente o Bedel. Body `{ contentType, size }` con la foto ya comprimida (JPG o PNG, hasta 1 MB). El cliente hace un PUT directo a `uploadUrl` y envía `key` como `fotoKey` al crear la incidencia. 503 si el almacenamiento (`STORAGE_*`) no está configurado.",
      request: { body: jsonBody(subirFotoIncidenciaSchema) },
      middleware: [reportantes] as const,
      responses: { 201: jsonResponse(fotoSubidaSchema, "URL de subida"), ...commonErrors },
    }),
    async (c) =>
      c.json(await incidencias.crearUrlFotoIncidencia(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Reportar una incidencia de infraestructura",
      description:
        "Docente (desde una clase suya con esa aula, `claseId`) o Bedel (cualquier aula activa). Nace `ABIERTA` con fecha, hora y quién reportó. 422 ante datos inválidos o si la foto no está subida; 403 si el Docente no dicta la clase.",
      request: { body: jsonBody(crearIncidenciaSchema) },
      middleware: [reportantes] as const,
      responses: { 201: jsonResponse(incidenciaSchema, "Incidencia creada"), ...commonErrors },
    }),
    async (c) => c.json(await incidencias.crearIncidencia(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Incidencias abiertas, las más recientes primero",
      description:
        "Pestaña Abiertas: Abierta y En curso, sin filtro de estado ni paginación. Bedel y Autoridad académica (solo lectura).",
      middleware: [consultantes] as const,
      responses: { 200: jsonResponse(z.array(incidenciaSchema), "Incidencias"), ...commonErrors },
    }),
    async (c) => c.json(await incidencias.listarIncidencias(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/historial",
      tags,
      summary: "Historial de incidencias resueltas en un rango de fechas",
      description:
        "Solo lectura, Bedel y Autoridad académica. Solo Resueltas. `desde` y `hasta` son obligatorios (yyyy-mm-dd, hora argentina, inclusivos, hasta 12 meses) y filtran por la fecha del reporte; `aulaId` es opcional. El total cuenta todo el período filtrado; el detalle pagina de a 20, la más reciente primero, e incluye el historial de estados.",
      request: { query: consultaIncidenciasSchema },
      responses: {
        200: jsonResponse(consultaIncidenciasResultadoSchema, "Total y detalle"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(
        await incidencias.consultarHistorialIncidencias(c.get("auth"), c.req.valid("query")),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      tags,
      summary: "Detalle de una incidencia con foto e historial",
      description: "Bedel y Autoridad académica. `fotoUrl` es una URL firmada de lectura.",
      request: { params: idParamSchema },
      middleware: [consultantes] as const,
      responses: { 200: jsonResponse(incidenciaDetalleSchema, "Incidencia"), ...commonErrors },
    }),
    async (c) =>
      c.json(await incidencias.obtenerIncidencia(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/estado",
      tags,
      summary: "Avanzar el estado de una incidencia",
      description:
        "Solo Bedel. Abierta → En curso → Resuelta con `observaciones` opcionales (hasta 500); sin retroceso y Resuelta es final (409). Al resolver, `rehabilitarAula` pasa el aula a Disponible.",
      request: { params: idParamSchema, body: jsonBody(cambiarEstadoIncidenciaSchema) },
      middleware: [soloBedel] as const,
      responses: { 200: jsonResponse(incidenciaDetalleSchema, "Incidencia"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await incidencias.cambiarEstadoIncidencia(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  );
