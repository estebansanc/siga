import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  actualizarCarreraSchema,
  actualizarComisionSchema,
  actualizarDiaNoLaborableSchema,
  actualizarHorarioSchema,
  actualizarMateriaSchema,
  actualizarPeriodoSchema,
  buscarComisionesQuerySchema,
  crearCarreraSchema,
  crearComisionSchema,
  crearDiaNoLaborableSchema,
  crearHorarioSchema,
  crearMateriaSchema,
  crearPeriodoSchema,
} from "@repo/domain";

import type { ApiEnv } from "../context";
import { perfilOnly } from "../middleware";
import {
  aulaSchema,
  carreraGestionSchema,
  carreraSchema,
  comisionGestionSchema,
  comisionSchema,
  diaNoLaborableGestionSchema,
  docenteAsignableSchema,
  generacionClasesSchema,
  generarClasesBodySchema,
  gestionQuerySchema,
  horarioGestionSchema,
  horariosQuerySchema,
  idParamSchema,
  materiaGestionSchema,
  materiaSchema,
  materiasQuerySchema,
  periodoGestionSchema,
} from "../schemas";
import * as datosAcademicos from "../services/datos-academicos";

import { commonErrors, jsonBody, jsonResponse } from "./shared";

const tags = ["Datos académicos"];

const gestores = perfilOnly("BEDEL", "AUTORIDAD");

export const carreraRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Carreras activas",
      responses: { 200: jsonResponse(z.array(carreraSchema), "Carreras"), ...commonErrors },
    }),
    async (c) => c.json(await datosAcademicos.listarCarreras(c.get("auth").organizationId), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/gestion",
      tags,
      summary: "Carrera para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: gestionQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(carreraGestionSchema), "Listado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarCarrerasGestion(c.get("auth"), c.req.valid("query").bajas),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Carrera",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearCarreraSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(carreraGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearCarrera(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Carrera",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarCarreraSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(carreraGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarCarrera(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Carrera",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(carreraGestionSchema, "Dado de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.darDeBajaCarrera(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Carrera",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(carreraGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.reactivarCarrera(c.get("auth"), c.req.valid("param").id), 200),
  );

export const materiaRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Materias activas, filtrables por carrera y año",
      request: { query: materiasQuerySchema },
      responses: { 200: jsonResponse(z.array(materiaSchema), "Materias"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarMaterias(c.get("auth").organizationId, c.req.valid("query")),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/gestion",
      tags,
      summary: "Materia para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: gestionQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(materiaGestionSchema), "Listado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarMateriasGestion(c.get("auth"), c.req.valid("query").bajas),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Materia",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearMateriaSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(materiaGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearMateria(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Materia",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarMateriaSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(materiaGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarMateria(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Materia",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(materiaGestionSchema, "Dado de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.darDeBajaMateria(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Materia",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(materiaGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.reactivarMateria(c.get("auth"), c.req.valid("param").id), 200),
  );

export const comisionRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Buscar comisiones activas por carrera, año y materia",
      request: { query: buscarComisionesQuerySchema },
      responses: { 200: jsonResponse(z.array(comisionSchema), "Comisiones"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.buscarComisiones(c.get("auth").organizationId, c.req.valid("query")),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/generar-clases",
      tags,
      summary: "Generar las clases programadas de un período o de una comisión",
      description:
        "Una clase por horario y fecha del período, sin días no laborables; las que ya existen se conservan y las que no consiguen aula quedan sin aula.",
      request: { body: jsonBody(generarClasesBodySchema) },
      middleware: [perfilOnly("BEDEL", "AUTORIDAD")] as const,
      responses: {
        200: jsonResponse(generacionClasesSchema, "Resumen de la generación"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(await datosAcademicos.generarClases(c.get("auth"), c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/gestion",
      tags,
      summary: "Comisión para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: gestionQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(comisionGestionSchema), "Listado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarComisionesGestion(c.get("auth"), c.req.valid("query").bajas),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Comisión",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearComisionSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(comisionGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearComision(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Comisión",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarComisionSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(comisionGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarComision(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Comisión",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(comisionGestionSchema, "Dado de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.darDeBajaComision(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Comisión",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(comisionGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.reactivarComision(c.get("auth"), c.req.valid("param").id), 200),
  );

export const periodoRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Período lectivo para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: gestionQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(periodoGestionSchema), "Listado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarPeriodosGestion(c.get("auth"), c.req.valid("query").bajas),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Período lectivo",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearPeriodoSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(periodoGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearPeriodo(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Período lectivo",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarPeriodoSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(periodoGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarPeriodo(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Período lectivo",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(periodoGestionSchema, "Dado de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.darDeBajaPeriodo(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Período lectivo",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(periodoGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.reactivarPeriodo(c.get("auth"), c.req.valid("param").id), 200),
  );

export const diaNoLaborableRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Día no laborable para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: gestionQuerySchema },
      middleware: [gestores] as const,
      responses: {
        200: jsonResponse(z.array(diaNoLaborableGestionSchema), "Listado"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.listarDiasNoLaborablesGestion(
          c.get("auth"),
          c.req.valid("query").bajas,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Día no laborable",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearDiaNoLaborableSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(diaNoLaborableGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearDiaNoLaborable(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Día no laborable",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarDiaNoLaborableSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(diaNoLaborableGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarDiaNoLaborable(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Día no laborable",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: {
        200: jsonResponse(diaNoLaborableGestionSchema, "Dado de baja"),
        ...commonErrors,
      },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.darDeBajaDiaNoLaborable(c.get("auth"), c.req.valid("param").id),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Día no laborable",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(diaNoLaborableGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.reactivarDiaNoLaborable(c.get("auth"), c.req.valid("param").id),
        200,
      ),
  );

export const horarioRoutes = new OpenAPIHono<ApiEnv>()
  .openapi(
    createRoute({
      method: "get",
      path: "/aulas",
      tags,
      summary: "Aulas activas que se pueden elegir como aula habitual",
      description: "Solo Bedel y Autoridad.",
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(aulaSchema), "Aulas"), ...commonErrors },
    }),
    async (c) => c.json(await datosAcademicos.listarAulasHabituales(c.get("auth")), 200),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      summary: "Horario para administrar",
      description: "Solo Bedel y Autoridad. Los activos, o con `bajas=true` los dados de baja.",
      request: { query: horariosQuerySchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(z.array(horarioGestionSchema), "Listado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.listarHorariosGestion(c.get("auth"), c.req.valid("query")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      summary: "Dar de alta: Horario",
      description:
        "Solo Bedel y Autoridad. 409 si el código o la franja ya están en uso; 422 ante datos inválidos.",
      request: { body: jsonBody(crearHorarioSchema) },
      middleware: [gestores] as const,
      responses: { 201: jsonResponse(horarioGestionSchema, "Creado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.crearHorario(c.get("auth"), c.req.valid("json")), 201),
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags,
      summary: "Editar: Horario",
      description: "Solo Bedel y Autoridad. Los dados de baja no se editan: se reactivan antes.",
      request: { params: idParamSchema, body: jsonBody(actualizarHorarioSchema) },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(horarioGestionSchema, "Actualizado"), ...commonErrors },
    }),
    async (c) =>
      c.json(
        await datosAcademicos.actualizarHorario(
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
      path: "/{id}/baja",
      tags,
      summary: "Dar de baja: Horario",
      description:
        "Solo Bedel y Autoridad. Baja lógica: el código sigue ocupado y se puede reactivar. 409 si tiene dependientes activos.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(horarioGestionSchema, "Dado de baja"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.darDeBajaHorario(c.get("auth"), c.req.valid("param").id), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{id}/reactivar",
      tags,
      summary: "Reactivar: Horario",
      description: "Solo Bedel y Autoridad.",
      request: { params: idParamSchema },
      middleware: [gestores] as const,
      responses: { 200: jsonResponse(horarioGestionSchema, "Reactivado"), ...commonErrors },
    }),
    async (c) =>
      c.json(await datosAcademicos.reactivarHorario(c.get("auth"), c.req.valid("param").id), 200),
  );

export const docenteRoutes = new OpenAPIHono<ApiEnv>().openapi(
  createRoute({
    method: "get",
    path: "/",
    tags,
    summary: "Docentes que se pueden asignar a una comisión",
    description: "Solo Bedel y Autoridad. Usuarios con perfil Docente que no están desactivados.",
    middleware: [gestores] as const,
    responses: { 200: jsonResponse(z.array(docenteAsignableSchema), "Docentes"), ...commonErrors },
  }),
  async (c) => c.json(await datosAcademicos.listarDocentesAsignables(c.get("auth")), 200),
);
