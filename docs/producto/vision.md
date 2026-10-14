# Visión de producto

SiGA es un sistema web de gestión operativa académica. Centraliza y comunica en tiempo real la información del día a día del cursado presencial: si la institución está abierta, qué aula tiene cada clase, si el docente llegó, qué novedades hay y qué avisos publicó la institución. La primera implementación es para la carrera de Ingeniería en Sistemas de Información (ISI) de la UTN Facultad Regional Tucumán (UTN FRT), pero el producto se diseña para ser adoptable por otras instituciones con dinámica similar.

Fuentes: Acta de Constitución V2, Solicitud de Aprobación de Tema V1.1, ERS v1.0 §1 y §2 (ver `fuentes/README.md`).

## El problema

La información operativa diaria de la UTN FRT está dispersa. Aulas asignadas, ausencias y demoras docentes, cambios de horario, suspensiones, paros y cierres se comunican por grupos de WhatsApp, cuentas de Instagram, carteles o de boca en boca. Bedelía lleva registros manuales en papel. Los sistemas académicos existentes (SIU-Guaraní, SYSACAD) resuelven inscripciones, notas e historial, pero no la coordinación operativa del día.

Consecuencias concretas:

- Estudiantes que trabajan o viajan desde el interior se trasladan sin saber si hay clase, si el docente va a asistir, en qué aula o si la facultad está abierta.
- Bedelía recibe consultas repetitivas y carga planillas a mano, con errores y retrabajo.
- Las autoridades no tienen trazabilidad ni datos históricos sobre asistencia, uso de aulas ni estado del equipamiento.

## La propuesta

Una plataforma web responsiva, accesible desde cualquier navegador sin instalación, con cuatro perfiles de usuario, cuatro módulos funcionales y uno transversal. No reemplaza a SIU-Guaraní ni a SYSACAD: los complementa en lo que ninguno cubre.

El actor central es el estudiante. La funcionalidad de mayor valor es que pueda consultar, antes de salir de su casa, el estado de sus clases de hoy en no más de dos interacciones desde el inicio de sesión.

## Usuarios

| Perfil              | Quién es                                                                | Cuándo usa SiGA                                         | Qué hace                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estudiante          | Alumno de la UTN FRT, inicialmente de ISI. Mayormente desde el celular. | A diario, antes de trasladarse y durante la jornada.    | Consulta estado institucional, estado de sus clases, aulas, novedades y avisos. Elige qué comisiones sigue y si recibe correos.                    |
| Docente             | Profesor o auxiliar. Usa el celular para escanear el QR.                | En cada clase y ante imprevistos.                       | Registra su asistencia por QR, publica novedades de sus clases, solicita aulas, reporta incidencias.                                               |
| Bedel               | Personal de bedelía. Usa PC en bedelía y a veces tablet o celular.      | De forma continua durante el horario de funcionamiento. | Registra apertura y cierre, gestiona aulas e incidencias, genera el QR, asigna aulas, publica avisos, administra usuarios y datos académicos base. |
| Autoridad académica | Directora de carrera, Secretaría Académica, Decanato.                   | Semanal o mensual.                                      | Consulta históricos consolidados y publica avisos institucionales.                                                                                 |

La matriz completa de permisos está en `requerimientos.md`.

## Qué hace SiGA (alcance del MVP)

1. Registra y publica el estado de la institución: abierta, cerrada o abierta con novedades.
2. Gestiona aulas y espacios: capacidad, equipamiento, estado, disponibilidad, ocupación e incidencias de infraestructura.
3. Genera códigos QR de asistencia docente por fecha, aula y turno, y registra la asistencia solo si el docente está dentro de la institución.
4. Permite a los docentes publicar novedades de sus clases (ausencia, demora, cambio a virtual, suspensión, cambio de aula) y solicitar aulas según alumnos y recursos.
5. Permite a los estudiantes consultar en tiempo real el estado de sus clases, filtrando por carrera, año, comisión y materia.
6. Publica avisos institucionales segmentados y los notifica por correo.
7. Registra un historial trazable de todos los eventos y ofrece consultas consolidadas a las autoridades.
8. Administra usuarios con cuatro perfiles y permisos diferenciados.

## Qué no hace (fuera de alcance del MVP)

- Inscripción a materias o exámenes, carga de notas, historial académico ni trámites administrativos.
- Integración automática con SIU-Guaraní, SYSACAD u otros sistemas: los datos académicos base se cargan en SiGA.
- Liquidación de haberes, control horario laboral ni sanciones al personal a partir de la asistencia.
- Aplicaciones móviles nativas: el acceso es exclusivamente web y responsivo.
- Gestión de mantenimiento edilicio más allá del registro y seguimiento de incidencias de aulas.

## Módulos

| Módulo                         | Especificación                                      | Requisitos                 |
| ------------------------------ | --------------------------------------------------- | -------------------------- |
| Usuarios y roles (transversal) | `especificaciones/usuarios-y-roles.md`              | RF-10, RF-11, RF-12, RF-13 |
| Novedades                      | `especificaciones/novedades.md`                     | RF-05, RF-07               |
| Aulas y espacios               | `especificaciones/aulas-y-espacios.md`              | RF-02, RF-06, RF-15, RF-16 |
| Actividad docente              | `especificaciones/actividad-docente.md`             | RF-03, RF-04, RF-18        |
| Avisos y estado institucional  | `especificaciones/avisos-y-estado-institucional.md` | RF-01, RF-08, RF-14, RF-17 |
| Histórico y consultas          | `especificaciones/historico-y-consultas.md`         | RF-09, RNF-03              |

## Principios de producto

- **Tiempo real significa 60 segundos como máximo.** Todo cambio (novedad, aula, asistencia, estado institucional) debe ser visible para los usuarios activos en menos de 60 segundos; el objetivo de diseño son 5 segundos.
- **Mobile first.** El estudiante consulta desde el teléfono; el docente escanea desde el teléfono. Pantallas desde 360 px de ancho, sin desplazamiento horizontal, elementos táctiles de 44×44 px como mínimo.
- **Estado con color, icono y texto a la vez.** Nunca solo color.
- **Trazabilidad total.** Cada evento se registra con fecha, hora y usuario responsable. Asistencias, novedades, estado institucional y auditoría no se modifican retroactivamente: las correcciones son eventos nuevos.
- **Datos mínimos y privacidad.** Solo se recolecta lo necesario. No se guardan coordenadas de ubicación, solo el resultado de la validación. Los estudiantes no ven motivos personales de una ausencia ni datos personales de los docentes.
- **Todo en español**, con mensajes de error que dicen cómo corregir el problema.
- **Fuente oficial y equitativa.** La información publicada en SiGA es la misma para todos, sin depender de grupos informales.
- **Sin sanciones.** La asistencia docente se usa solo para informar el estado de las clases y generar estadísticas; nunca para descuentos ni sanciones automáticas.

## Beneficios esperados

| Área                                        | Beneficio estimado                                              |
| ------------------------------------------- | --------------------------------------------------------------- |
| Tiempo de consulta de información académica | Reducción del 40 % al 60 %                                      |
| Consultas presenciales a bedelía            | Reducción del 30 % al 50 %                                      |
| Uso de formularios y registros físicos      | Reducción del 50 % al 70 %                                      |
| Traslados innecesarios de estudiantes       | Reducción del 90 % al 100 % ante novedades comunicadas a tiempo |
| Tiempo de difusión de novedades             | De horas o días a minutos                                       |
| Trazabilidad de eventos                     | 100 % de las novedades registradas                              |

## Contexto del proyecto

- **Cliente**: Departamento de Sistemas de la UTN FRT. Patrocinadora: Directora de la carrera ISI.
- **Marco**: Proyecto Final de Ingeniería en Sistemas de Información, comisión 5K2, Grupo 1, ciclo 2026.
- **Equipo**: Felipe Rocha (diseño), Nicolás Rodríguez (análisis), Lautaro Romano y Esteban Sánchez (programación). Tutor: Mauricio Sánchez.
- **Restricciones de producto**: cumplimiento de la Ley 25.326 de Protección de Datos Personales y de las políticas institucionales de la UTN FRT; toda la interfaz en español; comunicaciones por correo electrónico (sin SMS ni mensajería paga); entrega final antes del 18/11/2026.
- **Supuestos**: hay Wi-Fi institucional; los docentes tienen smartphone con cámara y aceptan dar permiso de cámara y ubicación al registrar asistencia; Secretaría Académica o bedelía proveen los datos académicos base al inicio del ciclo; la institución autoriza pruebas piloto en 2026 en ISI; la organización académica es carreras → años → materias → comisiones → turnos.

### Hitos de entrega del producto

| Entregable                                    | Fecha comprometida |
| --------------------------------------------- | ------------------ |
| Módulo de Novedades                           | 12/10/2026         |
| Módulo de Aulas y Espacios                    | 29/10/2026         |
| Módulo de Actividad Docente                   | 29/10/2026         |
| Módulo de Avisos                              | 29/10/2026         |
| MVP funcional integrado y desplegado          | 10/11/2026         |
| Versión final con manual de usuario e informe | 18/11/2026         |

Orden de desarrollo acordado: usuarios, perfiles y datos académicos base → estado institucional y novedades → aulas y asignación → asistencia por QR → avisos y preferencias → históricos. Si el cronograma aprieta, la contingencia definida en el Registro de Riesgos es priorizar Novedades y Aulas y Espacios como núcleo del MVP y postergar lo secundario de Avisos.

## Después del MVP

Requisitos futuros identificados en la ERS, fuera de alcance de esta versión:

- Integración con SIU-Guaraní y SYSACAD para importar carreras, materias, comisiones, horarios, docentes y estudiantes.
- Importación masiva de datos académicos base desde CSV o Excel.
- Soporte multi-institución sobre una misma instalación y extensión a todas las carreras de la UTN FRT. En el MVP hay una sola institución precargada.
- Notificaciones push por PWA y canales adicionales (Telegram, WhatsApp).
- Exportación de reportes históricos a PDF y Excel, y tablero de indicadores para autoridades.
- Reserva anticipada de aulas para eventos, consultas, recuperatorios y actividades especiales.
- Derivación de incidencias al área de mantenimiento como órdenes de trabajo.
- Registro de temas dictados por clase (pedido por los docentes en el Registro de Interesados).
