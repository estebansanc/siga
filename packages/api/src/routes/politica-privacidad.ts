import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { aceptarPoliticaSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { politicaPrivacidadSchema } from "../schemas";
import * as politica from "../services/politica-privacidad";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Política de privacidad"];

export const politicaPrivacidadRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Versión vigente de la política de privacidad",
      description:
        "Título, número de versión y texto (párrafos separados por una línea en blanco). `aceptadaEn` es la fecha en que la persona aceptó esta versión, o `null` si todavía no.",
      responses: {
        200: jsonResponse(politicaPrivacidadSchema, "Política vigente"),
        ...commonErrors,
      },
    }),
    async (c) => c.json(await politica.obtenerPoliticaVigente(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/aceptaciones",
      tags,
      summary: "Aceptar la versión vigente de la política de privacidad",
      description:
        "Registra fecha y hora de la aceptación. 409 si `version` no es la vigente (se publicó una nueva): no se registra nada y hay que leer la vigente con `GET`. Aceptar dos veces la misma versión es idempotente.",
      request: { body: jsonBody(aceptarPoliticaSchema) },
      responses: {
        200: jsonResponse(politicaPrivacidadSchema, "Política aceptada"),
        ...commonErrors,
      },
    }),
    async (c) => c.json(await politica.aceptarPolitica(c.get("auth"), c.req.valid("json")), 200),
  );
