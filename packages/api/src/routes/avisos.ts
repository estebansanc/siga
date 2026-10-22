import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { crearAvisoSchema, listarAvisosQuerySchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { avisoSchema, idParamSchema, notificacionAvisoSchema } from "../schemas";
import * as avisos from "../services/avisos";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Avisos"];

export const avisoRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Avisos institucionales según la vista pedida",
      description:
        "VIGENTES (por defecto, urgentes primero) e HISTORIAL (vencidos) devuelven los que le corresponden al usuario según el segmento. PUBLICADOS lista todos los de la institución y es solo de Bedel y Autoridad (403 para el resto).",
      request: { query: listarAvisosQuerySchema },
      responses: { 200: jsonResponse(z.array(avisoSchema), "Avisos"), ...commonErrors },
    }),
    async (c) => c.json(await avisos.listarAvisos(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Publicar un aviso institucional",
      description:
        "Solo Bedel y Autoridad. El aviso se ve entre `desde` (ahora si se omite) y `hasta`. Con `enviarPorCorreo` sale un correo por destinatario al publicar; a los estudiantes solo si activaron la opción de avisos. No se edita ni se borra.",
      request: { body: jsonBody(crearAvisoSchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: { 201: jsonResponse(avisoSchema, "Aviso publicado"), ...commonErrors },
    }),
    async (c) => c.json(await avisos.publicarAviso(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}/notificaciones",
      tags,
      summary: "Resultado de los envíos por correo de un aviso",
      description:
        "Solo Bedel y Autoridad. Un registro por destinatario con su estado de envío: PENDING (Pendiente), SENT (Enviado) o FAILED (Fallido).",
      request: { params: idParamSchema },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: {
        200: jsonResponse(z.array(notificacionAvisoSchema), "Envíos del aviso"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await avisos.listarNotificacionesDeAviso(c.get("auth"), c.req.valid("param").id), 200),
  );
