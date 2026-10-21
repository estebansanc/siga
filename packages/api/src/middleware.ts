import { readAuthContext } from "@repo/auth";
import { measure, runWithAuditActor } from "@repo/db";
import type { Perfil } from "@repo/domain";
import { createMiddleware } from "hono/factory";

import type { ApiEnv } from "./context";
import { apiEnv } from "./env";
import { ApiError, forbidden } from "./errors";
import { consumeRateLimit } from "./services/rate-limit";

const publicPaths = ["/openapi.json", "/docs", "/preferencias/baja-correo"];

export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  const path = c.req.path.replace(/^\/api\/v1/, "");
  if (publicPaths.includes(path) || path.startsWith("/cron/")) return next();

  const { auth, setCookies } = await measure("session", () => readAuthContext(c.req.raw.headers));
  if (!auth) throw new ApiError(401, "UNAUTHORIZED", "Iniciá sesión para continuar");
  // Better Auth renueva la caché de sesión en cookie: sin reenviarla, cada request volvería a
  // la base cuando vence.
  for (const cookie of setCookies) c.header("set-cookie", cookie, { append: true });
  c.set("auth", auth);
  await runWithAuditActor({ userId: auth.userId, organizationId: auth.organizationId }, next);
});

// Configuración es del Administrador: un miembro de una organización ajena solo lee.
export const ownerOnly = createMiddleware<ApiEnv>(async (c, next) => {
  if (c.get("auth").role !== "owner") {
    throw forbidden("Solo el Administrador de la organización puede hacer esto");
  }
  await next();
});

// Las rutas de SiGA declaran qué perfiles las usan (matriz de permisos de
// `docs/producto/requerimientos.md`); el servicio vuelve a verificarlo y audita el rechazo.
export const perfilOnly = (...perfiles: Perfil[]) =>
  createMiddleware<ApiEnv>(async (c, next) => {
    if (!perfiles.includes(c.get("auth").perfil)) throw forbidden("Acceso denegado");
    await next();
  });

export const requireCronSecret = createMiddleware(async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  if (!apiEnv.cronSecret || header !== `Bearer ${apiEnv.cronSecret}`) {
    throw new ApiError(401, "UNAUTHORIZED", "Cron no autorizado");
  }
  await next();
});

const clientIp = (headers: Headers) =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headers.get("x-real-ip")?.trim() ||
  "local";

export type RateLimitRule = { scope: string; limit: number; windowSeconds: number };

// Para rutas abiertas o costosas: cada regla cuenta por IP y alcance en su propia ventana.
export const rateLimit = (...rules: RateLimitRule[]) =>
  createMiddleware(async (c, next) => {
    const ip = clientIp(c.req.raw.headers);
    for (const rule of rules) {
      await consumeRateLimit(`${ip}|${rule.scope}`, rule.limit, rule.windowSeconds);
    }
    await next();
  });
