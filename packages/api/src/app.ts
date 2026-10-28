import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { UnauthorizedError } from "@repo/auth";
import { Prisma } from "@repo/db";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiEnv } from "./context";
import { runWithDefer, type DeferAdapter } from "./deferred";
import { ApiError } from "./errors";
import { requireSession } from "./middleware";
import { asistenciaRoutes } from "./routes/asistencias";
import { aulaRoutes } from "./routes/aulas";
import { avisoRoutes } from "./routes/avisos";
import { claseRoutes } from "./routes/clases";
import { cronRoutes } from "./routes/cron";
import { cuentaRoutes } from "./routes/cuenta";
import {
  carreraRoutes,
  comisionRoutes,
  diaNoLaborableRoutes,
  docenteRoutes,
  horarioRoutes,
  materiaRoutes,
  periodoRoutes,
} from "./routes/datos-academicos";
import { estadoInstitucionalRoutes } from "./routes/estado-institucional";
import { historicoRoutes } from "./routes/historico";
import { incidenciaRoutes } from "./routes/incidencias";
import { meRoutes } from "./routes/me";
import { memberRoutes } from "./routes/members";
import { novedadRoutes } from "./routes/novedades";
import { preferenciaRoutes } from "./routes/preferencias";
import { qrRoutes } from "./routes/qr";
import { settingsRoutes } from "./routes/settings";
import { solicitudAulaRoutes } from "./routes/solicitudes-aula";
import { usuarioRoutes } from "./routes/usuarios";
import { measureRequest } from "./timing";

export const apiBasePath = "/api/v1";

const errorBody = (
  code: string,
  message: string,
  issues?: { path: string; message: string }[],
) => ({
  error: { code, message, ...(issues ? { issues } : {}) },
});

const toErrorResponse = (
  error: unknown,
): { status: ContentfulStatusCode; body: ReturnType<typeof errorBody> } => {
  if (error instanceof ApiError)
    return { status: error.status, body: errorBody(error.code, error.message, error.issues) };
  if (error instanceof UnauthorizedError) {
    return { status: 401, body: errorBody("UNAUTHORIZED", error.message) };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { status: 409, body: errorBody("CONFLICT", "Ya existe un registro con esos datos") };
  }
  console.error(error);
  return { status: 500, body: errorBody("INTERNAL", "Ocurrió un error inesperado") };
};

export type CreateApiOptions = { defer?: DeferAdapter };

export const createApi = ({ defer }: CreateApiOptions = {}) => {
  const app = new OpenAPIHono<ApiEnv>({
    defaultHook: (result, c) => {
      if (result.success) return;
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return c.json(errorBody("VALIDATION", "Revisá los datos ingresados", issues), 422);
    },
  }).basePath(apiBasePath);

  app.onError((error, c) => {
    const { status, body } = toErrorResponse(error);
    return c.json(body, status);
  });

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  });

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "SiGA API",
      version: "1.0.0",
      description:
        "Sesión y perfil, estado institucional, clases programadas, novedades, avisos institucionales, preferencias del estudiante, datos académicos base, aulas, solicitudes de aula, asistencia docente, incidencias de infraestructura y gestión de usuarios y perfiles. Autenticación por cookie (web) o bearer token (móvil).",
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  });
  app.get("/docs", swaggerUI({ url: `${apiBasePath}/openapi.json` }));

  app.use("*", measureRequest);
  app.use("*", (_, next) => runWithDefer(defer, next));
  app.use("*", requireSession);

  return app
    .route("/cuenta", cuentaRoutes)
    .route("/me", meRoutes)
    .route("/settings", settingsRoutes)
    .route("/members", memberRoutes)
    .route("/usuarios", usuarioRoutes)
    .route("/estado-institucional", estadoInstitucionalRoutes)
    .route("/clases", claseRoutes)
    .route("/novedades", novedadRoutes)
    .route("/historico", historicoRoutes)
    .route("/avisos", avisoRoutes)
    .route("/preferencias", preferenciaRoutes)
    .route("/carreras", carreraRoutes)
    .route("/materias", materiaRoutes)
    .route("/comisiones", comisionRoutes)
    .route("/periodos-lectivos", periodoRoutes)
    .route("/horarios", horarioRoutes)
    .route("/dias-no-laborables", diaNoLaborableRoutes)
    .route("/docentes", docenteRoutes)
    .route("/aulas", aulaRoutes)
    .route("/solicitudes-aula", solicitudAulaRoutes)
    .route("/incidencias", incidenciaRoutes)
    .route("/qr", qrRoutes)
    .route("/asistencias", asistenciaRoutes)
    .route("/cron", cronRoutes);
};

export type ApiType = ReturnType<typeof createApi>;
