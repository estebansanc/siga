import { z } from "@hono/zod-openapi";
import {
  alumnosSolicitudSchema,
  equipamientoSchema,
  estadoAulaSchema,
  estadoSolicitudAulaSchema,
  estadoClaseSchema,
  estadoInstitucionSchema,
  estadoNovedadSchema,
  invitationStatusSchema,
  memberRoleSchema,
  modalidadSchema,
  perfilSchema,
  tipoNovedadSchema,
  turnoSchema,
} from "@repo/domain";

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }),
  })
  .openapi("ApiError");

export const idParamSchema = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

export const userIdParamSchema = z.object({
  userId: z.string().openapi({ param: { name: "userId", in: "path" } }),
});

export const okSchema = z.object({ ok: z.literal(true) }).openapi("Ok");

export const myOrganizationSchema = z
  .object({ id: z.string(), name: z.string(), slug: z.string(), role: memberRoleSchema })
  .openapi("MyOrganization");
export type MyOrganizationDto = z.infer<typeof myOrganizationSchema>;

export const lostOrganizationSchema = z
  .object({ id: z.string(), name: z.string() })
  .openapi("LostOrganization");

export const meSchema = z
  .object({
    userId: z.string(),
    userName: z.string(),
    userEmail: z.string(),
    organizationId: z.string(),
    role: memberRoleSchema,
    perfil: z.enum(perfilSchema.options).openapi({
      description: "Perfil de SiGA: decide el panel principal y los permisos",
    }),
    organizations: z.array(myOrganizationSchema).openapi({
      description: "Todas las organizaciones de la cuenta: la propia y las que la invitaron",
    }),
    lostOrganization: lostOrganizationSchema.nullable().openapi({
      description:
        "La organización activa dejó de tener membresía y la sesión volvió a la propia; `null` en el resto de los casos.",
    }),
  })
  .openapi("Me");
export type MeDto = z.infer<typeof meSchema>;

const franjaTurnoDtoSchema = z.object({ inicio: z.string(), fin: z.string() });

export const settingsSchema = z
  .object({
    name: z.string(),
    turnos: z.object({
      MANANA: franjaTurnoDtoSchema,
      TARDE: franjaTurnoDtoSchema,
      NOCHE: franjaTurnoDtoSchema,
    }),
  })
  .openapi("Settings");
export type SettingsDto = z.infer<typeof settingsSchema>;

export const memberSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    email: z.string(),
    role: memberRoleSchema,
    createdAt: z.string(),
  })
  .openapi("Member");
export type MemberDto = z.infer<typeof memberSchema>;

export const pendingInvitationSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    expiresAt: z.string(),
    createdAt: z.string(),
  })
  .openapi("PendingInvitation");
export type PendingInvitationDto = z.infer<typeof pendingInvitationSchema>;

export const invitationSchema = z
  .object({
    id: z.string(),
    organizationName: z.string(),
    status: invitationStatusSchema,
    expiresAt: z.string(),
    forCurrentUser: z
      .boolean()
      .openapi({ description: "La invitación es para el email de la sesión" }),
  })
  .openapi("Invitation");
export type InvitationDto = z.infer<typeof invitationSchema>;

export const invitationResolutionSchema = z
  .object({ organizationName: z.string() })
  .openapi("InvitationResolution");
export type InvitationResolutionDto = z.infer<typeof invitationResolutionSchema>;

export const cronResultSchema = z
  .object({ processed: z.number(), failed: z.number() })
  .openapi("CronResult");

export const dailyCronResultSchema = z
  .object({ emails: cronResultSchema, purgedRateLimitBuckets: z.number() })
  .openapi("DailyCronResult");
export type DailyCronResultDto = z.infer<typeof dailyCronResultSchema>;

// ---------- SiGA ----------

const usuarioResumenSchema = z.object({ id: z.string(), nombre: z.string() });

export const estadoInstitucionalSchema = z
  .object({
    id: z.string().nullable().openapi({
      description: "`null` cuando no hay ningún registro todavía (se asume Abierta)",
    }),
    estado: estadoInstitucionSchema,
    motivo: z.string().nullable(),
    desde: z.string(),
    vigenciaHasta: z.string().nullable(),
    usuario: usuarioResumenSchema.nullable(),
  })
  .openapi("EstadoInstitucional");
export type EstadoInstitucionalDto = z.infer<typeof estadoInstitucionalSchema>;

export const cambioEstadoInstitucionalSchema = z
  .object({
    estado: estadoInstitucionalSchema,
    clasesSuspendidas: z.number().int(),
  })
  .openapi("CambioEstadoInstitucional");
export type CambioEstadoInstitucionalDto = z.infer<typeof cambioEstadoInstitucionalSchema>;

export const carreraSchema = z
  .object({ id: z.string(), codigo: z.string(), nombre: z.string() })
  .openapi("Carrera");
export type CarreraDto = z.infer<typeof carreraSchema>;

export const materiaSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    nombre: z.string(),
    anioCarrera: z.number().int(),
    carreraId: z.string(),
  })
  .openapi("Materia");
export type MateriaDto = z.infer<typeof materiaSchema>;

export const aulaSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    edificio: z.string(),
    piso: z.string(),
    capacidad: z.number().int(),
    equipamiento: z.array(z.string()),
  })
  .openapi("Aula");
export type AulaDto = z.infer<typeof aulaSchema>;

const aulaResumenSchema = aulaSchema.pick({ id: true, codigo: true, edificio: true, piso: true });

export const comisionSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    turno: turnoSchema,
    anioLectivo: z.number().int(),
    materia: materiaSchema,
    carrera: carreraSchema,
    docentes: z.array(usuarioResumenSchema),
  })
  .openapi("Comision");
export type ComisionDto = z.infer<typeof comisionSchema>;

export const claseNovedadSchema = z
  .object({
    id: z.string(),
    tipo: tipoNovedadSchema,
    estado: estadoNovedadSchema,
    minutosDemora: z.number().int().nullable(),
    enlaceVirtual: z.string().nullable(),
    aulaNueva: aulaResumenSchema.nullable(),
    mensaje: z.string().nullable(),
    publicadaPorBedelia: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("ClaseNovedad");
export type ClaseNovedadDto = z.infer<typeof claseNovedadSchema>;

export const claseSchema = z
  .object({
    id: z.string(),
    fecha: z.string().openapi({ description: "yyyy-mm-dd en hora argentina" }),
    horaInicio: z.string(),
    horaFin: z.string(),
    inicio: z.string(),
    fin: z.string(),
    estado: estadoClaseSchema,
    modalidad: modalidadSchema,
    comision: z.object({ id: z.string(), codigo: z.string(), turno: turnoSchema }),
    materia: materiaSchema,
    carrera: carreraSchema,
    aula: aulaResumenSchema.nullable(),
    docentes: z.array(usuarioResumenSchema).openapi({
      description: "Solo el nombre: los estudiantes no ven datos personales del docente",
    }),
    novedades: z.array(claseNovedadSchema).openapi({
      description: "Las activas en el listado; en el detalle, también las finalizadas del día",
    }),
  })
  .openapi("Clase");
export type ClaseDto = z.infer<typeof claseSchema>;

export const clasesDelDiaSchema = z
  .object({ fecha: z.string(), clases: z.array(claseSchema) })
  .openapi("ClasesDelDia");
export type ClasesDelDiaDto = z.infer<typeof clasesDelDiaSchema>;

export const novedadSchema = z
  .object({
    id: z.string(),
    tipo: tipoNovedadSchema,
    estado: estadoNovedadSchema,
    minutosDemora: z.number().int().nullable(),
    enlaceVirtual: z.string().nullable(),
    aulaNueva: aulaResumenSchema.nullable(),
    mensaje: z.string().nullable(),
    publicadaPor: usuarioResumenSchema,
    publicadaPorBedelia: z.boolean(),
    createdAt: z.string(),
    finalizadaEn: z.string().nullable(),
    comision: z.object({ id: z.string(), codigo: z.string(), materia: z.string() }),
    clases: z.array(
      z.object({
        id: z.string(),
        fecha: z.string(),
        horaInicio: z.string(),
        horaFin: z.string(),
        estado: estadoClaseSchema,
      }),
    ),
  })
  .openapi("Novedad");
export type NovedadDto = z.infer<typeof novedadSchema>;

export const preferenciasSchema = z
  .object({
    comisiones: z.array(comisionSchema),
    notificarNovedadesPorCorreo: z.boolean(),
    notificarAvisosPorCorreo: z.boolean(),
  })
  .openapi("Preferencias");
export type PreferenciasDto = z.infer<typeof preferenciasSchema>;

export const generacionClasesSchema = z
  .object({ creadas: z.number().int(), existentes: z.number().int(), sinAula: z.number().int() })
  .openapi("GeneracionClases");
export type GeneracionClasesDto = z.infer<typeof generacionClasesSchema>;

export const generarClasesBodySchema = z.object({
  periodoLectivoId: z.string().optional(),
  comisionId: z.string().optional(),
});

export const materiasQuerySchema = z.object({
  carreraId: z.string().optional(),
  anio: z.coerce.number().int().min(1).max(6).optional(),
});

// Hono entrega cada query param como texto: varias clases viajan separadas por coma.
export const aulasDisponiblesQuerySchema = z.object({
  claseIds: z
    .string()
    .min(1)
    .transform((value) => value.split(",").filter(Boolean))
    .openapi({ description: "Ids de clases separados por coma", example: "clase-1,clase-2" }),
});

export const aulaGestionSchema = aulaSchema
  .extend({
    estado: estadoAulaSchema,
    ocupada: z.boolean().openapi({
      description: "Calculada: tiene una clase en curso que no está Suspendida, Ausente ni Virtual",
    }),
    observaciones: z.string().nullable(),
    activa: z.boolean(),
  })
  .openapi("AulaGestion");
export type AulaGestionDto = z.infer<typeof aulaGestionSchema>;

export const aulaClaseSchema = z
  .object({
    id: z.string(),
    fecha: z.string(),
    horaInicio: z.string(),
    horaFin: z.string(),
    estado: estadoClaseSchema,
    materia: z.string(),
    comision: z.string(),
  })
  .openapi("AulaClase");
export type AulaClaseDto = z.infer<typeof aulaClaseSchema>;

export const aulaDetalleSchema = aulaGestionSchema
  .extend({
    clases: z.array(aulaClaseSchema).openapi({ description: "Hoy y los próximos 7 días" }),
    clasesAfectadas: z.array(aulaClaseSchema).openapi({
      description:
        "Clases asignadas que todavía no terminaron: las que afecta pasar el aula a Fuera de servicio, En mantenimiento o darla de baja",
    }),
  })
  .openapi("AulaDetalle");
export type AulaDetalleDto = z.infer<typeof aulaDetalleSchema>;

export const aulasGestionQuerySchema = z.object({
  bajas: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
    .openapi({ description: "true lista las aulas dadas de baja en lugar de las activas" }),
});

export const buscarAulasQuerySchema = z.object({
  claseId: z.string().min(1),
  alumnos: alumnosSolicitudSchema,
  recursos: z
    .string()
    .optional()
    .transform((value) => (value ?? "").split(",").filter(Boolean))
    .pipe(z.array(equipamientoSchema))
    .openapi({
      description: "Recursos requeridos separados por coma",
      example: "Proyector,Pizarra",
    }),
});

export const clasesSolicitablesQuerySchema = z.object({
  fecha: z.iso.date().optional().openapi({ description: "yyyy-mm-dd; por defecto hoy" }),
});

export const aulaSugeridaSchema = aulaSchema
  .extend({
    faltantes: z.array(z.string()).openapi({
      description: 'Criterios que el aula no cumple, p. ej. "Capacidad para 100 alumnos"',
    }),
  })
  .openapi("AulaSugerida");
export type AulaSugeridaDto = z.infer<typeof aulaSugeridaSchema>;

export const busquedaAulaSchema = z
  .object({
    aulas: z.array(aulaSchema).openapi({
      description: "Libres en la franja y con todo lo pedido, de menor a mayor capacidad",
    }),
    sugerencias: z.array(aulaSugeridaSchema).openapi({
      description:
        "Si ninguna cumple todo: hasta 5 libres que cumplen en parte, las que fallan menos primero",
    }),
    hayAulasLibres: z.boolean(),
  })
  .openapi("BusquedaAula");
export type BusquedaAulaDto = z.infer<typeof busquedaAulaSchema>;

export const solicitudAulaSchema = z
  .object({
    id: z.string(),
    estado: estadoSolicitudAulaSchema,
    alumnos: z.number().int(),
    recursos: z.array(equipamientoSchema),
    comentario: z.string().nullable(),
    motivoRechazo: z.string().nullable(),
    createdAt: z.string(),
    aula: aulaResumenSchema,
    clase: z.object({
      id: z.string(),
      fecha: z.string(),
      horaInicio: z.string(),
      horaFin: z.string(),
      materia: z.string(),
      comision: z.string(),
    }),
  })
  .openapi("SolicitudAula");
export type SolicitudAulaDto = z.infer<typeof solicitudAulaSchema>;

export const sesionQrSchema = z
  .object({
    id: z.string(),
    token: z.string().openapi({ description: "Firmado; es lo que codifica el QR" }),
    aula: aulaResumenSchema,
    fecha: z.string().openapi({ description: "yyyy-mm-dd en hora argentina" }),
    turno: turnoSchema,
    turnoInicio: z.string(),
    turnoFin: z.string(),
    emitidoEn: z.string(),
    venceEn: z.string(),
  })
  .openapi("SesionQr");
export type SesionQrDto = z.infer<typeof sesionQrSchema>;

export const clasesDelTurnoSchema = z.array(claseSchema).openapi("ClasesDelTurno");
