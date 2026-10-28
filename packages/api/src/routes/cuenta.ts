import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { definirContrasenaSchema, recuperarContrasenaSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { rateLimit } from "../middleware";
import { errorSchema, okSchema } from "../schemas";
import * as recuperarContrasena from "../services/recuperar-contrasena";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Cuenta"];

const tooManyRequests = {
  429: {
    description: "Demasiados intentos",
    content: { "application/json": { schema: errorSchema } },
  },
};

export const cuentaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "post",
      path: "/recuperar-contrasena",
      tags,
      summary: "Pedir el enlace para recuperar la contraseña",
      description:
        "Público. Responde siempre 200, esté o no registrado el correo. Solo una cuenta activa recibe un correo con un enlace de un solo uso válido 60 minutos. Límite: 5 pedidos por IP cada 15 minutos y 3 por correo por hora (429 `RATE_LIMITED`).",
      request: { body: jsonBody(recuperarContrasenaSchema) },
      middleware: [
        rateLimit({ scope: "recuperar-contrasena", limit: 5, windowSeconds: 15 * 60 }),
      ] as const,
      responses: {
        200: jsonResponse(okSchema, "Pedido recibido"),
        ...tooManyRequests,
        ...commonErrors,
      },
    }),
    async (c) => {
      await recuperarContrasena.solicitarRecuperacion(c.req.valid("json").correo);
      return c.json({ ok: true as const }, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/definir-contrasena",
      tags,
      summary: "Definir la contraseña con el enlace recibido por correo",
      description:
        "Público. Actualiza la contraseña, invalida el enlace y cierra las demás sesiones de la cuenta (hasta 5 minutos si la web las tiene en la caché de sesión). 400 si el enlace venció, ya se usó o no es válido; 422 si la contraseña incumple la política o la confirmación no coincide.",
      request: { body: jsonBody(definirContrasenaSchema) },
      middleware: [
        rateLimit({ scope: "definir-contrasena", limit: 20, windowSeconds: 15 * 60 }),
      ] as const,
      responses: { 200: jsonResponse(okSchema, "Contraseña actualizada"), ...commonErrors },
    }),
    async (c) => {
      await recuperarContrasena.definirContrasena(c.req.valid("json"));
      return c.json({ ok: true as const }, 200);
    },
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/definir-contrasena/{token}",
      tags,
      summary: "Comprobar que el enlace para definir la contraseña sigue vigente",
      description: "Público. 400 si el enlace venció, ya se usó o no es válido.",
      request: { params: z.object({ token: z.string().min(1) }) },
      responses: { 200: jsonResponse(okSchema, "Enlace vigente"), ...commonErrors },
    }),
    async (c) => {
      await recuperarContrasena.verificarEnlace(c.req.valid("param").token);
      return c.json({ ok: true as const }, 200);
    },
  );
