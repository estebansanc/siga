import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { requireCronSecret } from "../middleware";
import { dailyCronResultSchema } from "../schemas";
import { purgarIntentosFallidos } from "../services/asistencias";
import { deliverPendingEmails } from "../services/emails/outbox";
import { purgeRateLimitBuckets } from "../services/rate-limit";

import { commonErrors, jsonResponse } from "./shared";

const tags = ["Cron"];

export const cronRoutes = new OpenAPIHono().openapi(
  createRoute({
    method: "get",
    path: "/daily",
    tags,
    summary: "Tareas diarias",
    description:
      "Reintenta los emails pendientes y limpia el rate limit y los intentos fallidos de asistencia viejos.",
    middleware: [requireCronSecret] as const,
    responses: { 200: jsonResponse(dailyCronResultSchema, "Resultado"), ...commonErrors },
  }),
  async (c) => {
    const emails = await deliverPendingEmails();
    const purgedRateLimitBuckets = await purgeRateLimitBuckets();
    const purgedIntentosAsistencia = await purgarIntentosFallidos();
    return c.json({ emails, purgedRateLimitBuckets, purgedIntentosAsistencia }, 200);
  },
);
