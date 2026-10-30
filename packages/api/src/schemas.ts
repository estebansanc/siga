import { z } from "@hono/zod-openapi";
import {
  alumnosSolicitudSchema,
  elementoIncidenciaSchema,
  equipamientoSchema,
  emailStatusSchema,
  estadoAulaSchema,
  estadoPlanoSchema,
  estadoSolicitudAulaSchema,
  estadoClaseSchema,
  estadoIncidenciaSchema,
  estadoInstitucionSchema,
  estadoNovedadSchema,
  estadoUsuarioSchema,
  gravedadIncidenciaSchema,
  metodoAsistenciaSchema,
  origenAsignacionAulaSchema,
  memberRoleSchema,
  modalidadSchema,
  perfilSchema,
  prioridadAvisoSchema,
  segmentoAvisoSchema,
  tipoNovedadSchema,
  turnoSchema,
  validacionPresenciaSchema,
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
    dni: z.string().nullable(),
    legajo: z.string().nullable(),
    bajaSolicitadaEn: z.iso.datetime().nullable().openapi({
      description:
        "Cuándo pidió la baja de su cuenta; `null` si no hay una solicitud pendiente de resolver.",
    }),
    organizationId: z.string(),
    role: memberRoleSchema,
    perfil: z.enum(perfilSchema.options).openapi({
      description: "Perfil de SiGA: decide el panel principal y los permisos",
    }),
    organizations: z.array(myOrganizationSchema).openapi({
      description: "Todas las organizaciones de la cuenta: la propia y las que la invitaron",
    }),
    politicaPendiente: z.boolean().openapi({
      description:
        "La persona todavía no aceptó la versión vigente de la política de privacidad: debe hacerlo antes de usar el resto de la app (`/politica-de-privacidad`).",
    }),
    lostOrganization: lostOrganizationSchema.nullable().openapi({
      description:
        "La organización activa dejó de tener membresía y la sesión volvió a la propia; `null` en el resto de los casos.",
    }),
  })
  .openapi("Me");
export type MeDto = z.infer<typeof meSchema>;

export const politicaPrivacidadSchema = z
  .object({
    version: z.number().int(),
    titulo: z.string(),
    texto: z.string(),
    publicadaEn: z.string(),
    aceptadaEn: z.string().nullable(),
  })
  .openapi("PoliticaPrivacidad");
export type PoliticaPrivacidadDto = z.infer<typeof politicaPrivacidadSchema>;

const franjaTurnoDtoSchema = z.object({ inicio: z.string(), fin: z.string() });

export const settingsSchema = z
  .object({
    name: z.string(),
    turnos: z.object({
      MANANA: franjaTurnoDtoSchema,
      TARDE: franjaTurnoDtoSchema,
      NOCHE: franjaTurnoDtoSchema,
    }),
    presencia: z.object({
      latitud: z.number(),
      longitud: z.number(),
      radioMetros: z.number().int(),
      redes: z
        .array(z.string())
        .openapi({ description: "Rangos CIDR IPv4 de la red institucional" }),
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

export const cronResultSchema = z
  .object({ processed: z.number(), failed: z.number() })
  .openapi("CronResult");

export const dailyCronResultSchema = z
  .object({
    emails: cronResultSchema,
    purgedRateLimitBuckets: z.number(),
    purgedIntentosAsistencia: z.number(),
  })
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

const datosNovedadSchema = z.object({
  minutosDemora: z.number().int().nullable(),
  enlaceVirtual: z.string().nullable(),
  aulaNueva: aulaResumenSchema.nullable(),
  mensaje: z.string().nullable(),
});

export const edicionNovedadSchema = datosNovedadSchema
  .extend({
    id: z.string(),
    createdAt: z.string(),
    editadaPorBedelia: z.boolean(),
  })
  .openapi("EdicionNovedad", { description: "Datos que quedaron vigentes con la edición" });
export type EdicionNovedadDto = z.infer<typeof edicionNovedadSchema>;

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
    publicacion: datosNovedadSchema.nullable().openapi({
      description: "Datos de la publicación original; null si la novedad no se editó",
    }),
    ediciones: z.array(edicionNovedadSchema).openapi({
      description: "Cada edición, de la más antigua a la más reciente; la publicación no se borra",
    }),
  })
  .openapi("ClaseNovedad");
export type ClaseNovedadDto = z.infer<typeof claseNovedadSchema>;

export const asistenciaSchema = z
  .object({
    id: z.string(),
    metodo: metodoAsistenciaSchema,
    horaLlegada: z.string().openapi({ description: "HH:mm en hora argentina" }),
    llegadaEn: z.string(),
    motivo: z.string().nullable().openapi({ description: "Solo en el registro manual" }),
    docente: usuarioResumenSchema,
    registradaPor: usuarioResumenSchema,
  })
  .openapi("Asistencia");
export type AsistenciaDto = z.infer<typeof asistenciaSchema>;

export const registroQrResultadoSchema = z
  .object({
    asistencia: asistenciaSchema,
    yaRegistrada: z.boolean().openapi({
      description: "true si la clase ya tenía asistencia (QR o manual): no se duplica",
    }),
    aula: aulaResumenSchema,
    turno: turnoSchema,
    validacion: validacionPresenciaSchema
      .nullable()
      .openapi({ description: "Cómo se validó la presencia; null si ya estaba registrada" }),
  })
  .openapi("RegistroQr");
export type RegistroQrResultadoDto = z.infer<typeof registroQrResultadoSchema>;

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
    asistencia: asistenciaSchema.nullable().openapi({
      description: "Solo para Bedel y Autoridad; los demás perfiles reciben null",
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
    editable: z.boolean().openapi({
      description: "Activa y con al menos una clase que aún no terminó",
    }),
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

export const bajaCorreoResultadoSchema = z
  .object({ ok: z.literal(true), tipo: z.enum(["novedades", "avisos"]) })
  .openapi("BajaCorreoResultado");
export type BajaCorreoResultadoDto = z.infer<typeof bajaCorreoResultadoSchema>;

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

export const incidenciaSchema = z
  .object({
    id: z.string(),
    aula: aulaGestionSchema.pick({
      id: true,
      codigo: true,
      edificio: true,
      piso: true,
      estado: true,
    }),
    elemento: elementoIncidenciaSchema,
    descripcion: z.string(),
    gravedad: gravedadIncidenciaSchema,
    estado: estadoIncidenciaSchema,
    tieneFoto: z.boolean(),
    createdAt: z.string(),
    reportadaPor: usuarioResumenSchema,
  })
  .openapi("Incidencia");
export type IncidenciaDto = z.infer<typeof incidenciaSchema>;

export const incidenciaEstadoSchema = z
  .object({
    estado: estadoIncidenciaSchema,
    observaciones: z.string().nullable(),
    createdAt: z.string(),
    usuario: usuarioResumenSchema,
  })
  .openapi("IncidenciaEstado");

export const incidenciaDetalleSchema = incidenciaSchema
  .extend({
    fotoUrl: z.string().nullable().openapi({
      description: "URL firmada de lectura, válida 1 hora; null si no tiene foto",
    }),
    historial: z.array(incidenciaEstadoSchema).openapi({
      description: "Cada estado con fecha, hora y usuario, del más antiguo al más nuevo",
    }),
  })
  .openapi("IncidenciaDetalle");
export type IncidenciaDetalleDto = z.infer<typeof incidenciaDetalleSchema>;

export const fotoSubidaSchema = z
  .object({
    key: z.string().openapi({ description: "Se envía como `fotoKey` al crear la incidencia" }),
    uploadUrl: z
      .string()
      .openapi({ description: "URL firmada para un PUT directo, válida 5 minutos" }),
  })
  .openapi("FotoSubida");
export type FotoSubidaDto = z.infer<typeof fotoSubidaSchema>;

export const aulaDetalleSchema = aulaGestionSchema
  .extend({
    clases: z.array(aulaClaseSchema).openapi({ description: "Hoy y los próximos 7 días" }),
    clasesAfectadas: z.array(aulaClaseSchema).openapi({
      description:
        "Clases asignadas que todavía no terminaron: las que afecta pasar el aula a Fuera de servicio, En mantenimiento o darla de baja",
    }),
    incidencias: z
      .array(incidenciaSchema)
      .openapi({ description: "Las incidencias del aula, recientes primero" }),
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
  alumnos: z
    .preprocess((valor) => (valor === "" ? undefined : valor), alumnosSolicitudSchema.optional())
    .openapi({
      description: "Entero mayor que 0. Obligatorio para el Docente; opcional para el Bedel",
    }),
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
    resueltaEn: z.string().nullable(),
    solicitante: usuarioResumenSchema,
    aula: aulaResumenSchema,
    clase: z.object({
      id: z.string(),
      aula: aulaResumenSchema.nullable().openapi({
        description: "El aula que tiene hoy la clase; null si no tiene",
      }),
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

export const avisoSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    cuerpo: z.string(),
    prioridad: prioridadAvisoSchema,
    destinatarios: segmentoAvisoSchema,
    desde: z.string(),
    hasta: z.string(),
    enviarPorCorreo: z.boolean(),
    publicadoPor: z.object({ id: z.string(), nombre: z.string() }),
    createdAt: z.string(),
  })
  .openapi("Aviso");
export type AvisoDto = z.infer<typeof avisoSchema>;

export const notificacionAvisoSchema = z
  .object({
    id: z.string(),
    destinatario: z.object({ id: z.string(), nombre: z.string(), email: z.string() }),
    estado: emailStatusSchema,
  })
  .openapi("NotificacionAviso");
export type NotificacionAvisoDto = z.infer<typeof notificacionAvisoSchema>;

export const consultaNovedadesResultadoSchema = z
  .object({
    total: z.number().int(),
    porTipo: z.object({
      AUSENCIA: z.number().int(),
      DEMORA: z.number().int(),
      VIRTUAL: z.number().int(),
      SUSPENSION: z.number().int(),
      CAMBIO_AULA: z.number().int(),
    }),
    pagina: z.number().int(),
    tamanioPagina: z.number().int(),
    totalPaginas: z.number().int(),
    novedades: z.array(novedadSchema),
  })
  .openapi("ConsultaNovedadesResultado");
export type ConsultaNovedadesResultadoDto = z.infer<typeof consultaNovedadesResultadoSchema>;

export const incidenciaHistoricaSchema = z
  .object({
    id: z.string(),
    reportadaEn: z.string(),
    aula: z.string(),
    elemento: elementoIncidenciaSchema,
    gravedad: gravedadIncidenciaSchema,
    estado: estadoIncidenciaSchema,
    descripcion: z.string(),
    reportadaPor: z.string(),
    historial: z.array(incidenciaEstadoSchema).openapi({
      description:
        "Cada estado con fecha, hora, usuario y observaciones, del más antiguo al más nuevo",
    }),
  })
  .openapi("IncidenciaHistorica");
export type IncidenciaHistoricaDto = z.infer<typeof incidenciaHistoricaSchema>;

export const consultaIncidenciasResultadoSchema = z
  .object({
    total: z.number().int(),
    pagina: z.number().int(),
    tamanioPagina: z.number().int(),
    totalPaginas: z.number().int(),
    incidencias: z.array(incidenciaHistoricaSchema),
  })
  .openapi("ConsultaIncidenciasResultado");
export type ConsultaIncidenciasResultadoDto = z.infer<typeof consultaIncidenciasResultadoSchema>;

export const opcionesHistoricoSchema = z
  .object({
    docentes: z.array(usuarioResumenSchema),
    aulas: z.array(z.object({ id: z.string(), codigo: z.string() })),
  })
  .openapi("OpcionesHistorico");
export type OpcionesHistoricoDto = z.infer<typeof opcionesHistoricoSchema>;

export const registroHistoricoSchema = z
  .object({
    id: z.string(),
    registradaEn: z.string(),
    docente: z.string(),
    materia: z.string(),
    comision: z.string(),
    aula: z.string().nullable(),
    metodo: metodoAsistenciaSchema,
    registradaPor: z.string(),
    registradaPorBedelia: z.boolean(),
  })
  .openapi("RegistroHistorico");
export type RegistroHistoricoDto = z.infer<typeof registroHistoricoSchema>;

export const consultaAsistenciasResultadoSchema = z
  .object({
    indicadores: z.object({
      clasesBase: z.number().int(),
      clasesConAsistencia: z.number().int(),
      porcentajeAsistencia: z.number().nullable(),
      clasesSinRegistro: z.number().int(),
      registrosQr: z.number().int(),
      porcentajeQr: z.number().nullable(),
      registrosManuales: z.number().int(),
    }),
    total: z.number().int(),
    pagina: z.number().int(),
    tamanioPagina: z.number().int(),
    totalPaginas: z.number().int(),
    registros: z.array(registroHistoricoSchema),
  })
  .openapi("ConsultaAsistenciasResultado");
export type ConsultaAsistenciasResultadoDto = z.infer<typeof consultaAsistenciasResultadoSchema>;

export const ocupacionAulaSchema = z
  .object({
    horasOcupadas: z.number(),
    horasDisponibles: z.number(),
    porcentaje: z.number().int(),
  })
  .openapi("OcupacionAula");

export const ocupacionPorAulaSchema = ocupacionAulaSchema
  .extend({
    id: z.string(),
    codigo: z.string(),
    edificio: z.string(),
    piso: z.string(),
    activa: z.boolean(),
  })
  .openapi("OcupacionPorAula");
export type OcupacionPorAulaDto = z.infer<typeof ocupacionPorAulaSchema>;

export const asignacionAulaHistoricaSchema = z
  .object({
    id: z.string(),
    asignadaEn: z.string(),
    aula: z.string(),
    materia: z.string(),
    comision: z.string(),
    fechaClase: z.string(),
    horaInicioClase: z.string(),
    horaFinClase: z.string(),
    origen: origenAsignacionAulaSchema,
    usuario: z.string(),
  })
  .openapi("AsignacionAulaHistorica");
export type AsignacionAulaHistoricaDto = z.infer<typeof asignacionAulaHistoricaSchema>;

export const consultaUsoAulasResultadoSchema = z
  .object({
    ocupacionGeneral: ocupacionAulaSchema,
    aulas: z.array(ocupacionPorAulaSchema),
    clasesDelPeriodo: z.number().int(),
    total: z.number().int(),
    pagina: z.number().int(),
    tamanioPagina: z.number().int(),
    totalPaginas: z.number().int(),
    asignaciones: z.array(asignacionAulaHistoricaSchema),
  })
  .openapi("ConsultaUsoAulasResultado");
export type ConsultaUsoAulasResultadoDto = z.infer<typeof consultaUsoAulasResultadoSchema>;

export const clasesSinAulaSchema = z
  .object({ clases: z.array(claseSchema) })
  .openapi("ClasesSinAula");
export type ClasesSinAulaDto = z.infer<typeof clasesSinAulaSchema>;

export const reemplazoAulaSchema = z
  .object({
    clase: claseSchema.openapi({ description: "La clase que entró al aula" }),
    desplazada: claseSchema.openapi({ description: "La clase que pasó al aula de destino" }),
  })
  .openapi("ReemplazoAula");
export type ReemplazoAulaDto = z.infer<typeof reemplazoAulaSchema>;

export const gestionQuerySchema = z.object({
  bajas: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true")
    .openapi({ description: "true lista los dados de baja en lugar de los activos" }),
});

export const carreraGestionSchema = carreraSchema
  .extend({ activa: z.boolean() })
  .openapi("CarreraGestion");
export type CarreraGestionDto = z.infer<typeof carreraGestionSchema>;

export const materiaGestionSchema = materiaSchema
  .extend({ activa: z.boolean(), carrera: carreraSchema })
  .openapi("MateriaGestion");
export type MateriaGestionDto = z.infer<typeof materiaGestionSchema>;

export const periodoGestionSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    fechaInicio: z.string(),
    fechaFin: z.string(),
    activo: z.boolean(),
  })
  .openapi("PeriodoLectivoGestion");
export type PeriodoGestionDto = z.infer<typeof periodoGestionSchema>;

export const comisionGestionSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    turno: turnoSchema,
    anioLectivo: z.number().int(),
    activa: z.boolean(),
    materia: materiaSchema,
    periodoLectivo: z.object({ id: z.string(), nombre: z.string() }),
    docentes: z.array(usuarioResumenSchema),
  })
  .openapi("ComisionGestion");
export type ComisionGestionDto = z.infer<typeof comisionGestionSchema>;

export const horarioGestionSchema = z
  .object({
    id: z.string(),
    diaSemana: z.number().int(),
    horaInicio: z.string(),
    horaFin: z.string(),
    activo: z.boolean(),
    comision: z.object({ id: z.string(), codigo: z.string(), materia: z.string() }),
    aulaHabitual: z.object({ id: z.string(), codigo: z.string() }).nullable(),
  })
  .openapi("HorarioGestion");
export type HorarioGestionDto = z.infer<typeof horarioGestionSchema>;

export const horariosQuerySchema = gestionQuerySchema.extend({
  comisionId: z.string().optional(),
});

export const diaNoLaborableGestionSchema = z
  .object({ id: z.string(), fecha: z.string(), motivo: z.string(), activo: z.boolean() })
  .openapi("DiaNoLaborableGestion");
export type DiaNoLaborableGestionDto = z.infer<typeof diaNoLaborableGestionSchema>;

export const docenteAsignableSchema = usuarioResumenSchema.openapi("DocenteAsignable");
export type DocenteAsignableDto = z.infer<typeof docenteAsignableSchema>;

// ---------- Usuarios y perfiles (RF-10) ----------

export const usuarioSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    correo: z.string(),
    dni: z.string().nullable(),
    legajo: z.string().nullable(),
    perfil: perfilSchema,
    estado: estadoUsuarioSchema,
    comisiones: z
      .array(z.object({ id: z.string(), codigo: z.string(), materia: z.string() }))
      .openapi({ description: "Comisiones que dicta (solo Docente)" }),
    esPropio: z.boolean().openapi({ description: "Es la cuenta de quien consulta" }),
    bajaSolicitada: z
      .object({ solicitadaEn: z.iso.datetime(), motivo: z.string().nullable() })
      .nullable()
      .openapi({ description: "Pedido de baja de la cuenta pendiente de resolver" }),
  })
  .openapi("Usuario");
export type UsuarioDto = z.infer<typeof usuarioSchema>;

export const dominiosPermitidosDtoSchema = z
  .object({
    dominios: z.array(z.string()).openapi({
      description: "Dominios aceptados en el autorregistro; vacía acepta cualquiera",
    }),
  })
  .openapi("DominiosPermitidos");
export type DominiosPermitidosDto = z.infer<typeof dominiosPermitidosDtoSchema>;

export const planoAulaSchema = aulaSchema
  .pick({ id: true, codigo: true, edificio: true, piso: true, capacidad: true })
  .extend({
    estadoAula: estadoAulaSchema,
    estado: estadoPlanoSchema,
    claseEnCurso: claseSchema.nullable(),
    proximaClase: claseSchema.nullable().openapi({
      description: "La próxima clase del día; solo si no hay una clase en curso",
    }),
  })
  .openapi("PlanoAula");
export type PlanoAulaDto = z.infer<typeof planoAulaSchema>;
