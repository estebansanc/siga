# Novedades

El módulo de mayor valor para el estudiante. El docente publica qué pasa con su clase y el estudiante lo ve en tiempo real, antes de salir de su casa.

Requisitos cubiertos: RF-05, RF-07. Criterios de aceptación: CA-03, CA-04. Fuente: ERS v1.0 §3.2.5, §3.2.7 y Apéndice D. Riesgo asociado: latencia mayor a 60 segundos (Riesgo 16).

## Conceptos

- **Clase programada**: instancia de dictado de una comisión en una fecha, con hora de inicio y fin, aula asignada, modalidad y estado. Las genera RF-13.
- **Novedad**: información publicada por el docente sobre una o más clases. Tipos:

| Tipo                          | Dato obligatorio del tipo                                 | Efecto sobre la clase                            |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Ausencia                      | —                                                         | Estado "Ausente" (final).                        |
| Demora                        | Minutos estimados de demora.                              | Estado "Demorada".                               |
| Cambio de modalidad (virtual) | Enlace válido a la clase virtual.                         | Estado "Virtual".                                |
| Suspensión                    | —                                                         | Estado "Suspendida" (final).                     |
| Cambio de aula                | Aula nueva, elegida entre las disponibles en ese horario. | No cambia el estado; actualiza el aula asignada. |

Toda novedad admite un mensaje opcional para los estudiantes de hasta 500 caracteres.

## RF-05 Publicación de novedades de clase

**Quién**: Docente, sobre sus propias clases. Bedel, sobre cualquier clase. La novedad registra quién la publicó y los estudiantes ven si la publicó el docente o bedelía.

**Entrada**: clase o clases afectadas (una comisión en una fecha, o una comisión en un rango de fechas), tipo de novedad, dato obligatorio del tipo, mensaje opcional.

Una novedad sobre un rango de fechas es una sola novedad que abarca todas las clases de la comisión en ese rango: editarla o finalizarla afecta a todas, y cada estudiante suscripto recibe un solo correo.

**Flujo**

1. El docente selecciona una o más de sus clases programadas y el tipo de novedad.
2. El sistema valida que las clases pertenezcan al docente y no hayan finalizado, y que el dato obligatorio del tipo esté completo y sea válido.
3. Para "Cambio de aula", el sistema verifica que el aula nueva esté disponible en ese horario y, si lo está, la reserva (misma regla de no superposición de RF-16).
4. El sistema registra la novedad con fecha, hora y usuario responsable, y actualiza el estado de la clase según la tabla de tipos.
5. El sistema publica la novedad en tiempo real y envía un correo por novedad a cada estudiante que sigue la comisión y tiene activadas las notificaciones (RF-17). No se agrupan ni se difieren.
6. El docente puede editar o dar por finalizada una novedad. Cada modificación queda en el historial; nada se borra. Finalizar una Demora o un Cambio de modalidad devuelve la clase a Programada si no tiene asistencia registrada; un Cambio de aula finalizado restituye el aula anterior si sigue libre. Las novedades de Ausencia y Suspensión no se finalizan, porque la clase quedó en estado final: solo se edita su mensaje.

**Edición**

- La edita el Docente de la comisión (aunque la haya publicado bedelía) o el Bedel desde "Editar novedad" en el listado; la Autoridad no. Solo una novedad activa con al menos una clase que aún no terminó.
- Se edita el dato propio del tipo y el mensaje, que puede vaciarse: minutos (Demora), enlace (Cambio de modalidad) o aula nueva (Cambio de aula); Ausencia y Suspensión, solo el mensaje. El tipo y las clases no cambian y las clases terminadas quedan como están.
- En Cambio de aula el selector ofrece solo aulas libres en la franja de cada clase; si al guardar el aula ya se ocupó, se rechaza con "El aula ya está asignada en esa franja" y nada cambia. El aula anterior queda liberada y finalizar la novedad restituye el aula previa a la novedad.
- Cada edición es un evento "Novedad editada" en el historial de la clase, con fecha, hora, autor y datos nuevos; la publicación original sigue visible (DAT-3). Una novedad de varias clases se edita una vez para todas. Guardar sin cambios no genera evento y editar no envía correo.

**Reglas**

- La novedad nunca expone el motivo personal de una ausencia. Los estudiantes ven el tipo y el mensaje que el docente decide publicar.
- No se puede publicar una novedad sobre una clase finalizada.
- Publicar una novedad debe llevar menos de 1 minuto y no más de 4 pasos (US-2).

**Salidas**: novedad visible para los estudiantes de la comisión en menos de 60 segundos; correo a los suscriptos; confirmación al docente; error ante datos incompletos, enlace inválido, aula no disponible o clase ya finalizada.

## RF-07 Consulta del estado de clases por el estudiante

**Quién**: Estudiante. También Docente (sus propias clases), Bedel y Autoridad.

**Entrada**: filtros opcionales y combinables: carrera, año, comisión, materia y fecha (por defecto, hoy). Si el estudiante configuró comisiones seguidas (RF-17), se aplican como filtro por defecto.

**Flujo**

1. El estudiante entra a "Mis clases" (sus comisiones seguidas) o a la búsqueda de clases.
2. El sistema aplica los filtros combinados sobre las clases programadas.
3. Por cada clase muestra: materia, comisión, horario, aula asignada, estado del docente (Sin registrar / Presente / Demorado / Ausente) y novedades activas.
4. La vista se actualiza sola ante cualquier cambio, sin recargar la página.
5. Si la institución está cerrada, lo indica de forma destacada antes del listado.

**Reglas**

- Un estudiante llega al estado de sus clases de hoy en no más de 2 interacciones desde el inicio de sesión (US-1).
- Los estados se muestran con color, icono y texto a la vez: verde "Docente presente", amarillo "Demorada", rojo "Suspendida" o "Ausente".
- Latencia máxima de 60 segundos; objetivo 5 segundos.

**Salidas**: listado actualizado de clases con su estado; "No se encontraron clases" si ningún resultado coincide.

## Estados de una clase

| Estado           | Significado                                                                                                                                    | Lo produce                                                   | Siguientes                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Programada       | Prevista, sin registro del docente.                                                                                                            | Generación de clases (RF-13).                                | Docente presente, Demorada, Ausente, Virtual, Suspendida |
| Demorada         | El docente avisó que llega tarde.                                                                                                              | Novedad Demora.                                              | Docente presente, Ausente, Suspendida                    |
| Docente presente | Asistencia registrada.                                                                                                                         | QR (RF-04) o manual (RF-18).                                 | Finalizada                                               |
| Virtual          | Se dicta en modalidad virtual.                                                                                                                 | Novedad Cambio de modalidad.                                 | Finalizada                                               |
| Ausente          | El docente no asistirá.                                                                                                                        | Novedad Ausencia.                                            | Final                                                    |
| Suspendida       | Suspendida por el docente o por cierre institucional.                                                                                          | Novedad Suspensión o estado institucional "Cerrada" (RF-01). | Final                                                    |
| Finalizada       | Terminó la franja horaria. Si la clase seguía Programada, queda Finalizada sin registro de asistencia docente y así se cuenta en el histórico. | Fin del horario.                                             | Final                                                    |

## Pantallas

- **Estudiante**: Mis clases de hoy (panel principal), con el indicador de estado institucional arriba; búsqueda de clases con filtros combinados.
- **Docente**: Mis clases; Publicar novedad (selección de clases, tipo, datos del tipo, mensaje, confirmación); listado de novedades propias con editar y finalizar.
- **Bedel**: ve el estado de todas las clases y puede publicar novedades sobre cualquiera.

## Fuera de alcance

- Notificaciones push: requisito futuro. En el MVP la notificación es por correo (RF-17) y por la actualización automática de la pantalla.
- Registro de temas dictados por clase: requisito futuro.
