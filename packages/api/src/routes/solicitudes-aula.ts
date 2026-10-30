import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  crearSolicitudAulaSchema,
  elegirAulaSchema,
  listarSolicitudesAulaQuerySchema,
  rechazarSolicitudAulaSchema,
} from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  buscarAulasQuerySchema,
  busquedaAulaSchema,
  clasesDelDiaSchema,
  clasesSolicitablesQuerySchema,
  idParamSchema,
  solicitudAulaSchema,
} from "../schemas";
import * as asignacion from "../services/asignacion-aulas";
import * as solicitudes from "../services/solicitudes-aula";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Solicitudes de aula"];
const solicitantes = perfilOnly("DOCENTE", "BEDEL");
const soloDocente = perfilOnly("DOCENTE");
const soloBedel = perfilOnly("BEDEL");

export const solicitudAulaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/clases",
      tags,
      summary: "Clases para las que se puede solicitar aula",
      description:
        "Solo Docente: las de sus comisiones. Excluye las terminadas y las Virtuales, Suspendidas, Ausentes o Finalizadas.",
      request: { query: clasesSolicitablesQuerySchema },
      middleware: [soloDocente] as const,
      responses: { 200: jsonResponse(clasesDelDiaSchema, "Clases del día"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await solicitudes.listarClasesSolicitables(c.get("auth"), c.req.valid("query").fecha),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/aulas",
      tags,
      summary: "Aulas para una clase según alumnos y recursos",
      description:
        "Activas, Disponibles, libres en la franja de la clase y con capacidad y recursos suficientes, de menor a mayor capacidad. Sin coincidencias devuelve hasta 5 `sugerencias` con los criterios que fallan. `alumnos` es opcional para el Bedel (sin filtros devuelve todas las libres) y obligatorio para el Docente; 422 si no es un entero mayor que 0.",
      request: { query: buscarAulasQuerySchema },
      middleware: [solicitantes] as const,
      responses: { 200: jsonResponse(busquedaAulaSchema, "Aulas"), ...commonErrors },
    }),
    async (c) =>
      c.json(await solicitudes.buscarAulasParaClase(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/mias",
      tags,
      summary: "Mis solicitudes de aula, las más recientes primero",
      description: "Solo Docente.",
      middleware: [soloDocente] as const,
      responses: {
        200: jsonResponse(z.array(solicitudAulaSchema), "Solicitudes"),
        ...commonErrors,
      },
    }),
    async (c) => c.json(await solicitudes.listarMisSolicitudesAula(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Solicitar un aula para una clase",
      description:
        "Solo Docente. Queda Pendiente (no reserva el aula). Si la clase no tiene aula y empieza en menos de 30 minutos o ya empezó, nace Asignada y el aula pasa a la clase. 409 si el aula ya está asignada en esa franja o la clase ya tiene una solicitud pendiente.",
      request: { body: jsonBody(crearSolicitudAulaSchema) },
      middleware: [soloDocente] as const,
      responses: { 201: jsonResponse(solicitudAulaSchema, "Solicitud creada"), ...commonErrors },
    }),
    async (c) =>
      c.json(await solicitudes.crearSolicitudAula(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Solicitudes de aula de un estado (Bedel)",
      description:
        "Solo Bedel. Pendientes y Asignadas (inmediatas) por franja más próxima; Aprobadas y Rechazadas, las resueltas más recientes primero.",
      request: { query: listarSolicitudesAulaQuerySchema },
      middleware: [soloBedel] as const,
      responses: {
        200: jsonResponse(z.array(solicitudAulaSchema), "Solicitudes"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(
        await asignacion.listarSolicitudesAulaPorEstado(c.get("auth"), c.req.valid("query").estado),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/aprobar",
      tags,
      summary: "Aprobar una solicitud Pendiente con el aula elegida",
      description:
        "Solo Bedel. La clase toma el aula; si ya tenía otra se publica un Cambio de aula. Envía un correo a los docentes de la comisión. 409 si el aula ya está asignada en esa franja o la solicitud ya no está pendiente.",
      request: { params: idParamSchema, body: jsonBody(elegirAulaSchema) },
      middleware: [soloBedel] as const,
      responses: { 200: jsonResponse(solicitudAulaSchema, "Solicitud aprobada"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await asignacion.aprobarSolicitudAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/rechazar",
      tags,
      summary: "Rechazar una solicitud Pendiente con un motivo",
      description:
        "Solo Bedel. Motivo obligatorio de hasta 280 caracteres; la clase conserva su aula. Envía un correo a los docentes de la comisión. 409 si la solicitud ya no está pendiente (una Asignada no se rechaza).",
      request: { params: idParamSchema, body: jsonBody(rechazarSolicitudAulaSchema) },
      middleware: [soloBedel] as const,
      responses: { 200: jsonResponse(solicitudAulaSchema, "Solicitud rechazada"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await asignacion.rechazarSolicitudAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reasignar",
      tags,
      summary: "Reasignar el aula de una solicitud Asignada",
      description:
        "Solo Bedel. La solicitud sigue Asignada con el aula nueva y se publica un Cambio de aula. Envía un correo a los docentes de la comisión. 409 si el aula ya está asignada en esa franja o la solicitud no está asignada.",
      request: { params: idParamSchema, body: jsonBody(elegirAulaSchema) },
      middleware: [soloBedel] as const,
      responses: {
        200: jsonResponse(solicitudAulaSchema, "Solicitud reasignada"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(
        await asignacion.reasignarSolicitudAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  );
