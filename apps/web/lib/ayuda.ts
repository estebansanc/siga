import type { MemberRole, Perfil } from "@repo/domain";

import { textoRegistroManual, textoSinCamara } from "./asistencia-sin-camara";

export type TareaGuia = { titulo: string; pasos: string[] };

export type SeccionManual = {
  titulo: string;
  paraQueSirve: string;
  comoSeLlega: string;
  pasos: string[];
  mensajes: string[];
};

export type AyudaDelPerfil = { guia: TareaGuia[]; manual: SeccionManual[] };

export const maximoPalabrasGuia = 700;

const menu = (titulo: string) => `Menú lateral, "${titulo}".`;

const misClasesEstudiante: SeccionManual = {
  titulo: "Mis clases",
  paraQueSirve:
    "Muestra las clases de hoy de las comisiones que seguís, con su estado y novedades.",
  comoSeLlega: menu("Mis clases"),
  pasos: [
    'Si todavía no seguís comisiones, tocá "Elegir comisiones" y agregalas.',
    "Cada tarjeta indica materia, horario, aula y estado.",
    "Tocá una clase para ver su detalle y sus novedades.",
  ],
  mensajes: [
    "Programada, Demorada N min, Docente presente, Virtual, Ausente, Suspendida y Finalizada son los estados de una clase.",
  ],
};

const misClasesDocente: SeccionManual = {
  titulo: "Mis clases",
  paraQueSirve: "Muestra tus clases de hoy con su estado y las novedades que publicaste.",
  comoSeLlega: menu("Mis clases"),
  pasos: [
    "Revisá la lista de clases de hoy: materia, comisión, horario y aula.",
    "Tocá una clase para ver su detalle.",
  ],
  mensajes: ["No tenés clases hoy: no hay clases asignadas para este día."],
};

const clases: SeccionManual = {
  titulo: "Clases",
  paraQueSirve: "Encuentra las clases de una fecha por carrera, año, materia o comisión.",
  comoSeLlega: menu("Clases"),
  pasos: [
    'Elegí la fecha en "Fecha" y completá los filtros que necesites.',
    "Tocá una clase del resultado para ver su estado y novedades.",
  ],
  mensajes: ["No se encontraron clases: ninguna coincide con los filtros elegidos."],
};

const avisosLectura: SeccionManual = {
  titulo: "Avisos",
  paraQueSirve: "Lista los avisos institucionales dirigidos a vos.",
  comoSeLlega: menu("Avisos"),
  pasos: [
    'Leé los avisos en "Vigentes"; los vencidos están en "Historial". Los urgentes también se señalan en el encabezado.',
  ],
  mensajes: ["No hay avisos vigentes: no tenés avisos para leer por ahora."],
};

const avisosGestion: SeccionManual = {
  titulo: "Avisos",
  paraQueSirve: "Publica avisos institucionales y consulta los vigentes y el historial.",
  comoSeLlega: menu("Avisos"),
  pasos: [
    'Tocá "Nuevo aviso" y completá "Título", "Cuerpo", "Prioridad", los destinatarios ("Todos" o por perfil), "Desde" y "Hasta".',
    'Activá "Enviar por correo" si querés avisar también por mail y tocá "Publicar".',
    'Las pestañas "Vigentes", "Historial" y "Publicados" listan los avisos; en "Publicados" se abre el "Resultado de envíos".',
  ],
  mensajes: ["No hay avisos vigentes: todavía no hay avisos para mostrar."],
};

const comisiones: SeccionManual = {
  titulo: "Comisiones",
  paraQueSirve: "Define las comisiones que seguís.",
  comoSeLlega:
    'Tocá tu nombre al pie del menú lateral, elegí "Mi cuenta" y la pestaña "Comisiones".',
  pasos: [
    'En "Agregar comisión" elegí carrera, año y materia, y tocá "Agregar" en la comisión.',
    'Para dejar de seguir una comisión, tocá "Quitar".',
  ],
  mensajes: [
    'Los cambios se guardan en el momento: aparece "Comisión agregada" o "Comisión quitada" y la comisión agregada pasa a decir "Agregada".',
  ],
};

const notificaciones: SeccionManual = {
  titulo: "Notificaciones",
  paraQueSirve: "Define qué correos recibís.",
  comoSeLlega:
    'Tocá tu nombre al pie del menú lateral, elegí "Mi cuenta" y la pestaña "Notificaciones".',
  pasos: [
    'Activá o desactivá "Recibir novedades por correo" o "Recibir avisos institucionales por correo".',
  ],
  mensajes: [
    "Los cambios se guardan en el momento.",
    "Por defecto los correos están desactivados.",
  ],
};

const asistencia: SeccionManual = {
  titulo: "Asistencia",
  paraQueSirve: "Registra tu presencia en la clase escaneando el QR de bedelía.",
  comoSeLlega: menu("Asistencia"),
  pasos: [
    "Permití el uso de la cámara y apuntala al QR que muestra bedelía.",
    'Esperá la confirmación "Asistencia registrada".',
  ],
  mensajes: [
    'Si falla la lectura, tocá "Volver a escanear".',
    'Si denegaste la cámara, habilitala desde los permisos del navegador y tocá "Volver a intentar".',
    `${textoSinCamara} ${textoRegistroManual}`,
  ],
};

const novedadesDocente: SeccionManual = {
  titulo: "Novedades",
  paraQueSirve:
    "Publica, edita y finaliza novedades de tus clases, como una demora o un cambio de aula.",
  comoSeLlega: menu("Novedades"),
  pasos: [
    'Tocá "Publicar novedad" y seguí "1. Clases afectadas", "2. Tipo de novedad" y "3. Detalle".',
    'Tocá "Publicar".',
    'En "Acciones de la novedad" elegí "Editar novedad": se cambia solo el dato propio del tipo y el "Mensaje para los estudiantes"; guardá con "Guardar".',
    'Para cerrarla, elegí "Finalizar novedad" en el mismo menú.',
  ],
  mensajes: [
    "El tipo y las clases no se modifican al editar. La publicación original queda en el historial.",
    "Activas muestra las novedades con clases por delante; las finalizadas o sin clases pendientes pasan al Historial, de solo lectura.",
  ],
};

const novedadesAutoridad: SeccionManual = {
  titulo: "Novedades",
  paraQueSirve: "Consulta las novedades de la institución sin modificarlas.",
  comoSeLlega: menu("Novedades"),
  pasos: [
    'En "Activas" leé las novedades con clases por delante.',
    'En "Historial" fijá "Desde" y "Hasta", elegí el "Tipo de novedad" y tocá "Consultar".',
  ],
  mensajes: [
    "La fecha desde no puede ser posterior a la fecha hasta.",
    "El rango de fechas no puede superar los 12 meses.",
  ],
};

const novedadesBedel: SeccionManual = {
  ...novedadesDocente,
  titulo: "Novedades",
  paraQueSirve: "Publica, edita y finaliza novedades de cualquier clase del día.",
};

const aulasDocente: SeccionManual = {
  titulo: "Solicitudes de aula",
  paraQueSirve: "Permite solicitar un aula para una clase y seguir tus solicitudes.",
  comoSeLlega: menu("Solicitudes de aula"),
  pasos: [
    'Tocá "Nueva solicitud" y completá "Fecha", "Clase", "Cantidad de alumnos" y "Recursos".',
    'Tocá "Buscar aulas", elegí una con "Elegir" y confirmá con "Confirmar solicitud".',
    'En la lista de "Solicitudes de aula" seguís su estado.',
  ],
  mensajes: [
    'No hay clases para pedir aula: en la fecha elegida no tenés clases que admitan el pedido. No aparecen las que ya terminaron ni las suspendidas, con ausencia docente o virtuales. Elegí otra fecha o tocá "Ver mis solicitudes".',
    "Pendiente: bedelía todavía no respondió. Asignada: el aula se asignó enseguida. Aprobada: bedelía aceptó la solicitud. Rechazada: se muestra el motivo.",
  ],
};

const aulasBedel: SeccionManual = {
  titulo: "Aulas",
  paraQueSirve: "Administra las aulas del campus y muestra su estado en tiempo real.",
  comoSeLlega: menu("Aulas"),
  pasos: [
    'Alterná entre "Lista" y "Plano" para ver las aulas como listado o por edificio y piso.',
    'Tocá "Nueva aula" para dar de alta un aula.',
    'En la Lista, tocá "Detalle" para ver la clase, asignar, mover o reemplazar clases y reportar incidencias; en el Plano, tocá el aula.',
    'En el menú de cada aula de la Lista elegí "Editar" o "Dar de baja".',
    'Con "Dadas de baja" ves las aulas dadas de baja.',
  ],
  mensajes: [
    "Sin aulas activas: todavía no hay aulas cargadas.",
    "Libre, Pendiente, Ocupada, Fuera de servicio y En mantenimiento describen el aula.",
  ],
};

const estado: SeccionManual = {
  titulo: "Estado institucional",
  paraQueSirve: "Muestra si la institución está abierta, cerrada o abierta con novedades.",
  comoSeLlega: menu("Estado institucional"),
  pasos: [
    "Revisá el estado actual y su historial.",
    'El Bedel elige el "Nuevo estado", indica el "Motivo" y toca "Cambiar estado".',
  ],
  mensajes: ["Al cerrar la institución se pide confirmación y se ofrece generar un aviso."],
};

const aulasAutoridad: SeccionManual = {
  titulo: "Aulas",
  paraQueSirve: "Muestra el estado de cada aula en tiempo real.",
  comoSeLlega: menu("Aulas"),
  pasos: [
    "Elegí el edificio y el piso.",
    "Tocá un aula para ver su clase actual y la asistencia.",
    'Con "Asignar clase", "Mover clase" o "Reemplazar clase" reorganizás las clases de hoy.',
  ],
  mensajes: ["Libre, Pendiente, Ocupada, Fuera de servicio y En mantenimiento describen el aula."],
};

const qr: SeccionManual = {
  titulo: "Asistencia docente",
  paraQueSirve:
    "Registra la asistencia de los docentes de dos formas: con el QR que escanean o con un registro manual.",
  comoSeLlega: menu("Asistencia docente"),
  pasos: [
    'En "Generar QR", revisá el turno (viene el actual) y elegí el aula.',
    'Tocá "Generar QR"; se renueva solo.',
    'Usá "Pantalla completa" para proyectarlo.',
    'Si un docente no puede escanear, en "Registro manual" tocá "Registrar asistencia manual" y registrá su asistencia con "Registrar asistencia".',
  ],
  mensajes: ["El turno terminado deja de mostrar el QR."],
};

const solicitudes: SeccionManual = {
  titulo: "Solicitudes",
  paraQueSirve: "Resuelve las solicitudes de aula de los docentes.",
  comoSeLlega: menu("Solicitudes"),
  pasos: [
    "Elegí una solicitud pendiente.",
    'Tocá "Aprobar" y asigná el aula, o "Rechazar" e indicá el motivo.',
    'En "Clases sin aula" tocá "Asignar aula"; si querés, completá "Cantidad de alumnos" y marcá "Recursos", elegí un aula y tocá "Asignar".',
  ],
  mensajes: [
    "No hay aulas libres en esa franja.",
    "Ninguna aula cumple todos los criterios: se listan hasta 5 aulas libres con lo que les falta.",
    "El aula ya está asignada en esa franja: elegí otra.",
  ],
};

const incidencias: SeccionManual = {
  titulo: "Incidencias",
  paraQueSirve: "Registra y resuelve problemas de infraestructura de las aulas.",
  comoSeLlega: menu("Incidencias"),
  pasos: [
    'Tocá "Nueva incidencia" y completá aula, elemento afectado y descripción; confirmá con "Reportar".',
    'Abrí la incidencia con "Detalle": una incidencia abierta se avanza con "Pasar a En curso".',
    'Cuando ya está en curso, el mismo botón pasa a ser "Resolver" y la incidencia pasa a la pestaña "Historial".',
    'En "Historial" fijá "Desde", "Hasta" y "Aula" y tocá "Consultar"; "Detalle" muestra los estados por los que pasó.',
  ],
  mensajes: [
    "Una incidencia que impide el uso puede dejar el aula fuera de servicio.",
    "El rango de fechas no puede superar los 12 meses.",
  ],
};

const incidenciasAutoridad: SeccionManual = {
  ...incidencias,
  paraQueSirve: "Consulta las incidencias de las aulas sin modificarlas.",
  pasos: [
    'En "Abiertas" leé las incidencias abiertas o en curso y tocá "Detalle" para ver su historial.',
    'En "Historial" fijá "Desde", "Hasta" y "Aula" y tocá "Consultar".',
  ],
  mensajes: ["El rango de fechas no puede superar los 12 meses."],
};

const historico: SeccionManual = {
  titulo: "Consultas históricas",
  paraQueSirve: "Consulta la asistencia docente y el uso de aulas de un período.",
  comoSeLlega: menu("Consultas históricas"),
  pasos: [
    'Elegí el tipo de consulta en las pestañas "Asistencia docente" o "Uso de aulas".',
    'Fijá "Desde" y "Hasta" y tocá "Consultar".',
  ],
  mensajes: ["Sin registros para el período: no hay datos en ese rango."],
};

const usuarios: SeccionManual = {
  titulo: "Usuarios",
  paraQueSirve: "Administra las cuentas de la institución.",
  comoSeLlega: menu("Usuarios"),
  pasos: [
    "Buscá o filtrá la lista.",
    'Tocá "Nuevo usuario" para dar de alta una cuenta.',
    'En "Acciones de" cada usuario elegí "Reenviar enlace de activación", "Reactivar" o "Desactivar".',
  ],
  mensajes: [
    'La cuenta del Administrador de la institución lleva el distintivo "Administrador" y no puede desactivarse.',
    "Tu propia cuenta no puede desactivarse.",
  ],
};

const datosAcademicos: SeccionManual = {
  titulo: "Datos académicos",
  paraQueSirve: "Mantiene carreras, materias, comisiones y horarios.",
  comoSeLlega: menu("Datos académicos"),
  pasos: [
    'Elegí la pestaña: "Carreras", "Materias", "Períodos", "Comisiones", "Horarios" o "Días no laborables".',
    'Creá un registro con el botón "Nueva ..." de la pestaña o editá uno existente.',
  ],
  mensajes: ["Los cambios se ven enseguida en las clases."],
};

const configuracion: SeccionManual = {
  titulo: "Configuración",
  paraQueSirve: "Administra la institución: nombre, turnos, presencia del docente y versión.",
  comoSeLlega: menu("Configuración"),
  pasos: [
    'Editá el nombre de la institución y tocá "Guardar".',
    'Ajustá "Turnos" y "Presencia del docente" y guardá con "Guardar turnos" o "Guardar presencia".',
    'Tocá "?" junto a la versión, al pie de la página, para abrir "Qué hay de nuevo" con los cambios de cada versión.',
  ],
  mensajes: ["Solo el Administrador ve esta sección.", "Las personas se gestionan en Usuarios."],
};

const miPerfil: SeccionManual = {
  titulo: "Mi cuenta",
  paraQueSirve: "Corregí tus datos o solicitá la baja de tu cuenta.",
  comoSeLlega: 'Tocá tu nombre al pie del menú lateral y elegí "Mi cuenta".',
  pasos: ['En la pestaña "Perfil" editá tus datos y tocá "Guardar".'],
  mensajes: ["Los demás usuarios ven tus cambios enseguida."],
};

const cerrarSesion: SeccionManual = {
  titulo: "Cerrar sesión",
  paraQueSirve: "Termina tu sesión en este dispositivo.",
  comoSeLlega: 'Tocá tu nombre al pie del menú lateral y elegí "Cerrar sesión".',
  pasos: ["La sesión se cierra enseguida y volvés a la pantalla de ingreso."],
  mensajes: ["Tu sesión se cierra solo en este dispositivo."],
};

const ayuda: SeccionManual = {
  titulo: "Ayuda",
  paraQueSirve: "Reúne esta guía rápida y el manual de tu perfil.",
  comoSeLlega: menu("Ayuda"),
  pasos: ['Elegí "Guía rápida" o "Manual de usuario".'],
  mensajes: ["Solo ves la ayuda del perfil activo."],
};

const comunes = [miPerfil, cerrarSesion];

export const ayudaPorPerfil: Record<Perfil, AyudaDelPerfil> = {
  ESTUDIANTE: {
    guia: [
      {
        titulo: "Elegir las comisiones que seguís",
        pasos: [
          'Entrá a "Mis clases" y tocá "Elegir comisiones".',
          'En "Agregar comisión" elegí carrera, año y materia, y tocá "Agregar" en cada comisión.',
          "Cada cambio se guarda en el momento.",
        ],
      },
      {
        titulo: "Ver tus clases del día con estado y novedades",
        pasos: [
          'En "Mis clases" cada tarjeta muestra horario, aula y estado.',
          "Tocá una clase para leer sus novedades, como una demora o un cambio de aula.",
        ],
      },
      {
        titulo: "Consultar las clases",
        pasos: [
          'Entrá a "Clases" y elegí la fecha en "Fecha".',
          "Filtrá por carrera, materia o comisión y abrí la clase.",
        ],
      },
      {
        titulo: "Leer los avisos",
        pasos: [
          'Entrá a "Avisos" y leé los vigentes.',
          "Los avisos urgentes también se señalan en el encabezado.",
        ],
      },
    ],
    manual: [misClasesEstudiante, clases, avisosLectura, comisiones, notificaciones],
  },
  DOCENTE: {
    guia: [
      {
        titulo: "Ver tus clases del día",
        pasos: ['Entrá a "Mis clases".', "Revisá materia, horario, aula y estado de cada clase."],
      },
      {
        titulo: "Registrar tu asistencia con QR",
        pasos: [
          'Entrá a "Asistencia" y permití el uso de la cámara.',
          "Apuntá al QR que muestra bedelía en el aula.",
          'Esperá "Asistencia registrada". Si falla, tocá "Volver a escanear".',
          "Si tu dispositivo no tiene cámara, abrí SiGA en tu celular; también podés pedirle al bedel que registre tu asistencia a mano.",
        ],
      },
      {
        titulo: "Publicar una novedad",
        pasos: [
          'Entrá a "Novedades" y tocá "Publicar novedad".',
          'Seguí "1. Clases afectadas", "2. Tipo de novedad" (por ejemplo Demora) y "3. Detalle".',
          'Tocá "Publicar".',
        ],
      },
      {
        titulo: "Editar o finalizar una novedad",
        pasos: [
          'En "Novedades" abrí "Acciones de la novedad".',
          'Elegí "Editar novedad", corregí el dato y tocá "Guardar", o elegí "Finalizar novedad" cuando ya no aplique.',
        ],
      },
      {
        titulo: "Solicitar un aula",
        pasos: [
          'Entrá a "Solicitudes de aula" y tocá "Nueva solicitud".',
          "En la lista seguís su estado.",
        ],
      },
    ],
    manual: [misClasesDocente, asistencia, novedadesDocente, avisosLectura, aulasDocente, clases],
  },
  BEDEL: {
    guia: [
      {
        titulo: "Registrar la apertura o el cierre de la institución",
        pasos: [
          'Entrá a "Estado institucional".',
          'Elegí el "Nuevo estado", escribí el motivo y tocá "Cambiar estado".',
          "Al cerrar, confirmá; se ofrece generar un aviso.",
        ],
      },
      {
        titulo: "Consultar las clases del día",
        pasos: [
          'Entrá a "Clases" y elegí la fecha en "Fecha".',
          "Tocá una clase para ver su detalle.",
        ],
      },
      {
        titulo: "Publicar una novedad",
        pasos: [
          'Entrá a "Novedades" y tocá "Publicar novedad".',
          'Seguí "1. Clases afectadas", "2. Tipo de novedad" y "3. Detalle".',
          'Tocá "Publicar".',
        ],
      },
      {
        titulo: "Generar el QR de asistencia",
        pasos: [
          'Entrá a "Asistencia docente", revisá el turno y elegí el aula.',
          'Tocá "Generar QR" y proyectalo con "Pantalla completa".',
        ],
      },
      {
        titulo: "Resolver una solicitud de aula",
        pasos: [
          'Entrá a "Solicitudes" y abrí una pendiente.',
          'Tocá "Aprobar" y asigná el aula, o "Rechazar" con el motivo.',
        ],
      },
      {
        titulo: "Registrar una incidencia",
        pasos: [
          'Entrá a "Incidencias" y tocá "Nueva incidencia".',
          'Elegí aula y elemento afectado, describilo y tocá "Reportar".',
        ],
      },
      {
        titulo: "Publicar un aviso",
        pasos: [
          'Entrá a "Avisos" y tocá "Nuevo aviso".',
          'Completá título, cuerpo, destinatarios y vigencia; tocá "Publicar".',
        ],
      },
    ],
    manual: [
      estado,
      clases,
      novedadesBedel,
      aulasBedel,
      qr,
      solicitudes,
      incidencias,
      historico,
      avisosGestion,
      usuarios,
      datosAcademicos,
    ],
  },
  AUTORIDAD: {
    guia: [
      {
        titulo: "Consultar las clases",
        pasos: [
          'Entrá a "Clases" y elegí la fecha en "Fecha".',
          "Revisá el estado de cada clase y tocá una para ver su detalle.",
        ],
      },
      {
        titulo: "Consultar los históricos",
        pasos: [
          'Entrá a "Consultas históricas" y elegí la pestaña del tipo de consulta.',
          'Fijá "Desde" y "Hasta" y tocá "Consultar".',
        ],
      },
      {
        titulo: "Publicar un aviso",
        pasos: ['Entrá a "Avisos" y tocá "Nuevo aviso".', 'Completá los datos y tocá "Publicar".'],
      },
      {
        titulo: "Consultar el estado institucional",
        pasos: [
          'Entrá a "Estado institucional" o tocá el indicador del encabezado.',
          "Leé el estado actual y su historial.",
        ],
      },
    ],
    manual: [
      clases,
      novedadesAutoridad,
      incidenciasAutoridad,
      historico,
      avisosGestion,
      aulasAutoridad,
      {
        ...estado,
        pasos: ["Revisá el estado actual y su historial."],
        mensajes: ["Solo el Bedel cambia el estado de la institución."],
      },
      usuarios,
      datosAcademicos,
    ],
  },
};

export const manualFor = (perfil: Perfil, role: MemberRole): SeccionManual[] => {
  const { manual } = ayudaPorPerfil[perfil];
  return [...manual, ...(role === "owner" ? [configuracion] : []), ayuda, ...comunes];
};

export const contarPalabras = (guia: TareaGuia[]) =>
  guia
    .flatMap((tarea) => [tarea.titulo, ...tarea.pasos])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
