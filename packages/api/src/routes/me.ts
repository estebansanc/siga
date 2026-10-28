import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { updateProfileSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import { meSchema } from "../schemas";
import { getMe, updateProfile } from "../services/me";

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
      request: { body: jsonBody(updateProfileSchema) },
      responses: { 200: jsonResponse(meSchema, "Perfil actualizado"), ...commonErrors },
    }),
    async (c) => c.json(await updateProfile(c.get("auth"), c.req.valid("json")), 200),
  );
