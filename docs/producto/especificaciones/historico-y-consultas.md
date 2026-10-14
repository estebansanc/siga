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

**Entrada**: tipo de consulta (asistencia docente, novedades, uso de aulas, incidencias), rango de fechas (obligatorio, máximo 12 meses por consulta) y filtros opcionales: carrera, materia, comisión, docente, aula y tipo de evento.

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

## Pantallas

- **Autoridad académica**: Consultas históricas (panel principal), con selección de tipo, rango de fechas, filtros, indicadores y detalle paginado.
- **Bedel**: historial operativo de aulas, asistencias e incidencias.

## Fuera de alcance

- Exportación a PDF y Excel y tablero de indicadores: requisitos futuros.
