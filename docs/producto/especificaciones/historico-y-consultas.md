# Histórico y consultas

Todo lo que pasa en SiGA queda registrado con fecha, hora y usuario responsable, y las autoridades pueden consultarlo consolidado para tomar decisiones sobre asistencia, uso de aulas y mantenimiento.

Requisitos cubiertos: RF-09, RNF-03. Criterio de aceptación: CA-06. Fuente: ERS v1.0 §3.2.9, §3.3 (reglas de datos), §3.4.11.

## Registro de auditoría

**Eventos que se registran**: inicios de sesión, asistencias, novedades, cambios de aula, cambios de estado institucional, altas y cambios de usuarios, generación de QR, asignaciones de aula, cambios de estado de incidencias, accesos denegados.

**Datos de cada evento**: fecha y hora, usuario, perfil, acción, entidad afectada, valores anteriores y nuevos.

**Reglas**

- Ningún perfil puede modificar ni eliminar el registro de auditoría.
- Asistencias, novedades, estado institucional y auditoría no se modifican ni eliminan retroactivamente; las correcciones son eventos nuevos.
- Las bajas de usuarios, aulas y comisiones son lógicas, para no perder el historial.
- Los datos históricos se conservan como mínimo durante dos ciclos lectivos.

## RF-09 Consultas históricas para autoridades

**Quién**: Autoridad académica (todo). Bedel (consultas operativas).

**Entrada**: tipo de consulta (asistencia docente y uso de aulas en Consultas históricas; el Historial de novedades y el de incidencias viven en sus secciones), rango de fechas (obligatorio, máximo 12 meses por consulta) y filtros opcionales: carrera, materia, comisión, docente, aula y tipo de evento.

**Flujo**

1. La autoridad elige el tipo de consulta y los filtros.
2. El sistema valida que la fecha desde sea menor o igual a la fecha hasta y que el rango no supere 12 meses.
3. Obtiene los registros y calcula indicadores resumidos.
4. Muestra el detalle paginado, con fecha, hora y usuario responsable de cada evento.

**Indicadores por tipo de consulta**

| Consulta           | Indicadores                                                                                                                 | Detalle                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Asistencia docente | Porcentaje de asistencia docente; registros por QR y manuales diferenciados; clases finalizadas sin registro de asistencia. | Cada asistencia con docente, comisión, aula, fecha y hora, método, usuario registrante. |
| Novedades          | Cantidad de novedades por tipo.                                                                                             | Cada novedad con clase, tipo, docente, fecha y hora, estado.                            |
| Uso de aulas       | Porcentaje de ocupación de aulas.                                                                                           | Cada asignación con aula, comisión, franja, usuario.                                    |
| Incidencias        | Incidencias abiertas y resueltas.                                                                                           | Cada incidencia con aula, elemento, gravedad, historial de estados.                     |

**Reglas**: una consulta de hasta 12 meses responde en menos de 10 segundos. "Sin registros para el período" si no hay datos.

**Salidas**: indicadores resumidos y listado detallado; error ante rango de fechas inválido.

## Estado de implementación

Hoy `/historico` entrega las consultas de **Asistencia docente** y **Uso de aulas** (Autoridad y Bedel). Novedades e Incidencias no se repiten acá: cada una tiene su pestaña **Historial** en su propia sección (más abajo).

**Uso de aulas** (`GET /historico/uso-aulas`): el rango filtra por la fecha de la clase (hora de Argentina, inclusivo) y los días futuros cuentan como ocupación prevista. _Ocupación general_ = horas ocupadas sobre horas disponibles de todas las aulas listadas. _Ocupación por aula_: aulas activas y dadas de baja con clases en el rango (una activa sin clases figura con 0 %), con código, edificio, piso, horas ocupadas, horas disponibles y porcentaje entero, de mayor a menor y luego por código. Ocupación = horas de clases presenciales del aula, sin Suspendidas, Ausentes ni Virtuales; disponibilidad = horas de los turnos configurados de cada lunes a sábado del rango que no sea día no laborable. _Asignaciones_ (de a 20, la más reciente primero): fecha y hora, aula, materia y comisión, fecha y franja de la clase, origen y usuario. Orígenes: Generación de clases, Solicitud aprobada, Asignación inmediata, Asignación de bedelía (aula a una clase sin aula) y Cambio de aula (novedad, Reasignar o aula restituida al finalizar). El filtro Origen restringe solo las asignaciones. Las previas se reconstruyen de horarios, solicitudes, novedades y auditoría; el usuario es "Sistema" cuando no consta. El Bedel arranca en Uso de aulas.

**Historial de Novedades** (pestaña "Historial" de `/novedades`, `GET /novedades/historial`): solo lectura. Lista las novedades finalizadas o sin clases por delante (las que no están en "Activas"). El rango filtra por la fecha de publicación (hora argentina, ambos días incluidos), se precarga con los últimos 30 días y 12 meses justos (21/10/2025 a 21/10/2026) es válido; el único filtro opcional es el tipo. Indicadores del período completo: total y cantidad por tipo. Detalle de a 20, la más reciente primero, con "Página X de Y". Desde posterior a Hasta muestra "La fecha desde no puede ser posterior a la fecha hasta" y más de 12 meses "El rango de fechas no puede superar los 12 meses"; en ambos casos la lista no cambia. El Docente solo ve las novedades de sus comisiones; Bedel y Autoridad, todas.

**Historial de Incidencias** (pestaña "Historial" de `/incidencias`, `GET /incidencias/historial`): solo lectura, Bedel y Autoridad. Lista las incidencias Resueltas; el rango filtra por la fecha del reporte (hora de Argentina, inclusivo, hasta 12 meses, 30 días precargados) y el único filtro opcional es el aula (también las dadas de baja). Indicador: total del período. Detalle de a 20, la más reciente primero, con "Página X de Y"; "Detalle" muestra, solo lectura, la descripción y cada estado con fecha, hora, usuario y observaciones. Mismas validaciones y mensajes del rango que el Historial de Novedades.

**Asistencia docente** (`GET /historico/asistencias`): el rango filtra por la fecha de la clase (hora de Argentina, inclusivo). Indicadores del período filtrado: _Asistencia docente_ (% de clases con asistencia sobre las presenciales ya terminadas, y esa cantidad), _Registros por QR_ (cantidad y % sobre el total de registros), _Registros manuales_ y _Clases sin registro_ (Finalizadas sin asistencia). Las Suspendidas y Virtuales quedan fuera de la base; una Ausente cuenta en la base sin asistencia, no como "sin registro". El docente filtrado es el de la asistencia o, sin registro, los de la comisión. El detalle (de a 20, el más reciente primero) muestra fecha y hora de llegada, docente, materia y comisión, aula, método (QR o Manual) y registrante (el Bedel con "(Bedelía)" en manual). Sin exportación ni tablero.

- La Autoridad y el Bedel ven "Consultas históricas" con Asistencia docente y Uso de aulas. Docente y Estudiante no ven la opción, `/historico` los devuelve al inicio y la API responde 403 "Acceso denegado" y lo audita.
- La Autoridad ve Novedades e Incidencias en el menú, después de "Clases", sin poder publicar, crear, editar ni cambiar estados.

## Pantallas

- **Autoridad académica**: Consultas históricas (asistencia docente y uso de aulas), con selección de tipo, rango de fechas, filtros, indicadores y detalle paginado; Novedades e Incidencias de solo lectura.
- **Bedel**: historial operativo de aulas y asistencias; el Historial de incidencias en Incidencias.

## Fuera de alcance

- Exportación a PDF y Excel y tablero de indicadores: requisitos futuros.
