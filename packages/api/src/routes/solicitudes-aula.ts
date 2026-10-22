import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { crearSolicitudAulaSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  buscarAulasQuerySchema,
  busquedaAulaSchema,
  clasesDelDiaSchema,
  clasesSolicitablesQuerySchema,
  solicitudAulaSchema,
} from "../schemas";
import * as solicitudes from "../services/solicitudes-aula";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Solicitudes de aula"];
const solicitantes = perfilOnly("DOCENTE", "BEDEL");

export const solicitudAulaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/clases",
      tags,
      summary: "Clases para las que se puede solicitar aula",
      description:
        "Docente: las de sus comisiones; Bedel: todas. Excluye las terminadas y las Virtuales, Suspendidas, Ausentes o Finalizadas.",
      request: { query: clasesSolicitablesQuerySchema },
      middleware: [solicitantes] as const,
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
        "Activas, Disponibles, libres en la franja de la clase y con capacidad y recursos suficientes, de menor a mayor capacidad. Sin coincidencias devuelve hasta 5 `sugerencias` con el criterio que falla. 422 si `alumnos` no es un entero mayor que 0.",
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
      middleware: [solicitantes] as const,
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
        "Queda Pendiente (no reserva el aula). Si la clase no tiene aula y empieza en menos de 30 minutos o ya empezó, nace Asignada y el aula pasa a la clase. 409 si el aula ya está asignada en esa franja o la clase ya tiene una solicitud pendiente.",
      request: { body: jsonBody(crearSolicitudAulaSchema) },
      middleware: [solicitantes] as const,
      responses: { 201: jsonResponse(solicitudAulaSchema, "Solicitud creada"), ...commonErrors },
    }),
    async (c) =>
      c.json(await solicitudes.crearSolicitudAula(c.get("auth"), c.req.valid("json")), 201),
  );
