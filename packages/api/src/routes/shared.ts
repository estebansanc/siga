import type { z } from "@hono/zod-openapi";

import { errorSchema } from "../schemas";

export const errorResponse = (description: string) => ({
  content: { "application/json": { schema: errorSchema } },
  description,
});

export const jsonBody = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});

export const optionalJsonBody = <T extends z.ZodType>(schema: T) => ({
  required: false,
  content: { "application/json": { schema } },
});

export const jsonResponse = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

export const commonErrors = {
  400: errorResponse("Solicitud inválida"),
  401: errorResponse("No autenticado"),
  403: errorResponse("Sin permiso"),
  404: errorResponse("No encontrado"),
  409: errorResponse("Conflicto"),
  422: errorResponse("Error de validación"),
};
