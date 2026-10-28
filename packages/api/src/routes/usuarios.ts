import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  dominiosPermitidosSchema,
  usuariosQuerySchema,
} from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import { dominiosPermitidosDtoSchema, idParamSchema, usuarioSchema } from "../schemas";
import * as usuarios from "../services/usuarios";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Usuarios"];

const gestores = perfilOnly("BEDEL", "AUTORIDAD");

export const usuarioRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Usuarios de la institución",
      description:
        "Solo Bedel y Autoridad. Se busca por nombre, correo o DNI (`q`) y se filtra por `perfil`.",
      request: { query: usuariosQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(usuarioSchema), "Usuarios"), ...commonErrors },
    }),
    async (c) => c.json(await usuarios.listarUsuarios(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta un usuario",
      description:
        "Solo Bedel y Autoridad. Queda Pendiente de activación y recibe un correo con un enlace de 24 horas para definir su contraseña. 409 con el campo `dni` o `correo` si ya existe.",
      request: { body: jsonBody(crearUsuarioSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(usuarioSchema, "Creado"), ...commonErrors },
    }),
    async (c) => c.json(await usuarios.crearUsuario(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/dominios",
      tags,
      summary: "Dominios de correo permitidos para registrarse",
      description: "Solo Bedel y Autoridad. Lista vacía: cualquier dominio.",
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(dominiosPermitidosDtoSchema, "Dominios"), ...commonErrors },
    }),
    async (c) => c.json(await usuarios.obtenerDominiosPermitidos(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/dominios",
      tags,
      summary: "Reemplazar los dominios de correo permitidos",
      description:
        "Solo Bedel y Autoridad. Rige para el autorregistro y Google, no para las altas.",
      request: { body: jsonBody(dominiosPermitidosSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(dominiosPermitidosDtoSchema, "Dominios"), ...commonErrors },
    }),
    async (c) =>
      c.json(await usuarios.actualizarDominiosPermitidos(c.get("auth"), c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar un usuario",
      description:
        "Solo Bedel y Autoridad. El correo no se edita. Nadie cambia su propio perfil (422). Pasar `comisionIds` reemplaza las comisiones del Docente.",
      request: { params: idParamSchema, body: jsonBody(actualizarUsuarioSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(usuarioSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await usuarios.actualizarUsuario(
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
      path: "/{id}/desactivar",
      tags,
      summary: "Desactivar un usuario",
      description:
        "Solo Bedel y Autoridad. Baja lógica: pierde el acceso y se conserva su historia. Nadie se desactiva a sí mismo (422).",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(usuarioSchema, "Desactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await usuarios.desactivarUsuario(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar un usuario",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(usuarioSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await usuarios.reactivarUsuario(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reenviar-activacion",
      tags,
      summary: "Reenviar el enlace de activación",
      description:
        "Solo Bedel y Autoridad. Invalida el enlace anterior. 409 si la cuenta ya está activada.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(usuarioSchema, "Reenviado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await usuarios.reenviarActivacion(c.get("auth"), c.req.valid("param").id), 200),
  );
