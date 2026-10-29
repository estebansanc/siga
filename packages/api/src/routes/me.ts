import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { solicitarBajaSchema, updateProfileSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { meSchema } from "../schemas";
import { getMe, solicitarBaja, updateProfile } from "../services/me";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Sesión"];

export const meRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Quién soy: usuario, rol y organización activa",
      description:
        "`organizations` lista todas las organizaciones de la cuenta (la propia y las que la invitaron), para saber de cuáles es miembro.",
      responses: { 200: jsonResponse(meSchema, "Sesión"), ...commonErrors },
    }),
    async (c) => c.json(await getMe(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/",
      tags,
      summary: "Actualizar el perfil del usuario",
      description:
        "Apellido y nombre, DNI y legajo, con las validaciones del alta. 409 con el campo `dni` si lo tiene otra cuenta. El correo y el perfil los cambia Bedelía.",
      request: { body: jsonBody(updateProfileSchema) },
      responses: { 200: jsonResponse(meSchema, "Perfil actualizado"), ...commonErrors },
    }),
    async (c) => c.json(await updateProfile(c.get("auth"), c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/solicitud-de-baja",
      tags,
      summary: "Solicitar la baja de mi cuenta",
      description:
        "Registra fecha y motivo (opcional, hasta 500 caracteres); la cuenta sigue activa hasta que Bedel o Autoridad la desactiven. 409 si ya hay una solicitud pendiente.",
      request: { body: jsonBody(solicitarBajaSchema) },
      responses: { 200: jsonResponse(meSchema, "Solicitud registrada"), ...commonErrors },
    }),
    async (c) => c.json(await solicitarBaja(c.get("auth"), c.req.valid("json")), 200),
  );
