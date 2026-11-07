import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { guardarPlanoSchema, importarAulasPlanoSchema, subirImagenPlanoSchema } from "@repo/domain";

import type { ApiEnv } from "../context";
import {
  deteccionAulasDtoSchema,
  idParamSchema,
  imagenPlanoSubidaSchema,
  importacionPlanoSchema,
  planoPisoDetalleSchema,
  planoPisoSchema,
} from "../schemas";
import * as planos from "../services/planos";

import { commonErrors, errorResponse, jsonBody, jsonResponse } from "./shared";

const tags = ["Planos"];

export const planoRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "post",
      path: "/imagen",
      tags,
      summary: "URL firmada para subir la imagen del plano de un piso",
      description:
        "Solo Bedel. Body `{ contentType, size }` (JPG o PNG, hasta 4 MB). El cliente hace un PUT directo a `uploadUrl` y envía `key` al guardar el plano. 503 si el almacenamiento (`STORAGE_*`) no está configurado.",
      request: { body: jsonBody(subirImagenPlanoSchema) },
      responses: { 201: jsonResponse(imagenPlanoSubidaSchema, "URL de subida"), ...commonErrors },
    }),
    async (c) => c.json(await planos.crearUrlImagenPlano(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Guardar o reemplazar el plano de un edificio y piso",
      description:
        "Solo Bedel. Responde 201 si crea el plano y 200 si reemplaza el de ese edificio y piso: la imagen anterior se borra y las aulas ubicadas conservan su polígono. `imagenUrl` es una URL firmada de lectura. 422 si la imagen no está subida o no es JPG o PNG de hasta 4 MB.",
      request: { body: jsonBody(guardarPlanoSchema) },
      responses: {
        200: jsonResponse(planoPisoSchema, "Plano reemplazado"),
        201: jsonResponse(planoPisoSchema, "Plano creado"),
        ...commonErrors,
      },
    }),
    async (c) => {
      const { plano, creado } = await planos.guardarPlano(c.get("auth"), c.req.valid("json"));
      return creado ? c.json(plano, 201) : c.json(plano, 200);
    },
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Planos de los pisos",
      description: "Solo Bedel. Ordenados por edificio y piso, con la cantidad de aulas ubicadas.",
      responses: { 200: jsonResponse(z.array(planoPisoSchema), "Planos"), ...commonErrors },
    }),
    async (c) => c.json(await planos.listarPlanos(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      tags,
      summary: "Plano de un piso con sus aulas ubicadas",
      description: "Solo Bedel. Cada aula trae su polígono.",
      request: { params: idParamSchema },
      responses: { 200: jsonResponse(planoPisoDetalleSchema, "Plano"), ...commonErrors },
    }),
    async (c) => c.json(await planos.obtenerPlano(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/aulas",
      tags,
      summary: "Importar en lote las aulas de un plano",
      description:
        "Solo Bedel. Todo o nada. Un código nuevo crea el aula Disponible, sin equipamiento, en el edificio y piso del plano, con su capacidad o `capacidadPorDefecto`. Un código activo del mismo piso solo se ubica: toma el polígono nuevo y conserva su capacidad. 409 nombrando el código si es de otro edificio o piso o está dado de baja; 422 ante polígonos inválidos o códigos repetidos. Queda en auditoría como cambio masivo.",
      request: { params: idParamSchema, body: jsonBody(importarAulasPlanoSchema) },
      responses: { 201: jsonResponse(importacionPlanoSchema, "Aulas importadas"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await planos.importarAulasDelPlano(
          c.get("auth"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        201,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/deteccion",
      tags,
      summary: "Detectar las aulas del plano guardado con IA",
      description:
        "Solo Bedel. Envía la imagen guardada del plano a Claude (Anthropic) y devuelve los recintos de dictado con `nombre` (nulo si no tiene rótulo), `confianza` (0 a 1) y `poligono`; no crea nada. El modelo se elige con `DETECCION_AULAS_MODELO` (haiku, sonnet u opus). 503 sin `ANTHROPIC_API_KEY` o sin almacenamiento; 502 si el proveedor falla o responde algo inválido.",
      request: { params: idParamSchema },
      responses: {
        200: jsonResponse(deteccionAulasDtoSchema, "Aulas detectadas"),
        502: errorResponse("Falló el proveedor de detección"),
        503: errorResponse("Detección o almacenamiento no configurados"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await planos.detectarAulasDelPlano(c.get("auth"), c.req.valid("param").id), 200),
  );
