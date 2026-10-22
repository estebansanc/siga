import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { actualizarPreferenciasSchema, bajaCorreoSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly, rateLimit } from "../middleware";
import { bajaCorreoResultadoSchema, preferenciasSchema } from "../schemas";
import * as notificaciones from "../services/notificaciones";
import * as preferencias from "../services/preferencias";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Preferencias"];

export const preferenciaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Comisiones que sigue el estudiante",
      middleware: [perfilOnly("ESTUDIANTE")] as const,
      responses: { 200: jsonResponse(preferenciasSchema, "Preferencias"), ...commonErrors },
    }),
    async (c) => c.json(await preferencias.obtenerPreferencias(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      tags,
      summary: "Reemplazar las comisiones seguidas",
      request: { body: jsonBody(actualizarPreferenciasSchema) },
      middleware: [perfilOnly("ESTUDIANTE")] as const,
      responses: {
        200: jsonResponse(preferenciasSchema, "Preferencias guardadas"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await preferencias.actualizarPreferencias(c.get("auth"), c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/baja-correo",
      tags,
      summary: "Dejar de recibir novedades de clase o avisos institucionales por correo",
      description:
        "Público: el token firmado del correo identifica al estudiante. Desactiva solo la opción que indica el token (novedades o avisos) y la devuelve en `tipo`. 400 si el token no es válido.",
      request: { body: jsonBody(bajaCorreoSchema) },
      middleware: [rateLimit({ scope: "baja-correo", limit: 20, windowSeconds: 600 })] as const,
      responses: {
        200: jsonResponse(bajaCorreoResultadoSchema, "Baja registrada"),
        ...commonErrors,
      },
    }),
    async (c) => {
      const tipo = await notificaciones.darDeBajaPorCorreo(c.req.valid("json").token);
      return c.json({ ok: true as const, tipo }, 200);
    },
  );
