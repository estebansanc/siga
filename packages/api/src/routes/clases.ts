import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { elegirAulaSchema, listarClasesQuerySchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { claseSchema, clasesDelDiaSchema, clasesSinAulaSchema, idParamSchema } from "../schemas";
import * as acciones from "../services/acciones-plano-aulas";
import * as asignacion from "../services/asignacion-aulas";
import * as clases from "../services/clases";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

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
      path: "/sin-aula",
      tags,
      summary: "Clases presenciales sin aula, de hoy a 7 días (Bedel)",
      description:
        "Solo Bedel. Excluye las terminadas y las Suspendidas, Ausentes, Virtuales o Finalizadas.",
      middleware: [perfilOnly("BEDEL")] as const,
      responses: { 200: jsonResponse(clasesSinAulaSchema, "Clases sin aula"), ...commonErrors },
    }),
    async (c) => c.json(await asignacion.listarClasesSinAula(c.get("auth")), 200),
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
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/aula",
      tags,
      summary: "Asignar aula a una clase sin aula (Bedel y Autoridad)",
      description:
        "Bedel y Autoridad. No publica novedad y envía un correo a los docentes de la comisión. 409 si el aula ya está asignada en esa franja o la clase ya tiene aula; 422 si la clase ya no admite asignación.",
      request: { params: idParamSchema, body: jsonBody(elegirAulaSchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(claseSchema, "Clase con aula"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await asignacion.asignarAulaAClaseSinAula(
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
      path: "/{id}/mover-aula",
      tags,
      summary: "Mover una clase con aula a otra aula (Bedel y Autoridad)",
      description:
        "Bedel y Autoridad. Publica un Cambio de aula de bedelía y envía el correo de reasignación a los docentes. 409 si el aula de destino ya está asignada en esa franja (nombra la comisión); 422 si la clase no tiene aula o ya no admite asignación.",
      request: { params: idParamSchema, body: jsonBody(elegirAulaSchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 200: jsonResponse(claseSchema, "Clase en el aula nueva"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await acciones.moverClaseDeAula(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  );
