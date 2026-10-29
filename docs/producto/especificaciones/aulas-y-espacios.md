# Aulas y espacios

Gestión de los espacios físicos de dictado: sus atributos, su disponibilidad y ocupación en tiempo real, las solicitudes de los docentes, la asignación sin superposiciones y las incidencias de infraestructura. Es la funcionalidad de mayor uso diario por parte de bedelía.

Requisitos cubiertos: RF-02, RF-06, RF-15, RF-16. Criterios de aceptación: CA-03, CA-04, CA-06. Fuente: ERS v1.0 §3.2.2, §3.2.6, §3.2.15, §3.2.16. Riesgo asociado: asignación simultánea de una misma aula a dos comisiones (Riesgo 17).

## Conceptos

- **Aula**: código o nombre único, ubicación (edificio y piso), capacidad (entero entre 1 y 500), equipamiento (proyector, pantalla, computadora, climatización, ventilación, pizarra, conectividad), estado, observaciones y marca de activa.
- **Estados de un aula** (editables por el bedel): Disponible, Fuera de servicio, En mantenimiento. "Ocupada" no se edita: se calcula en tiempo real a partir de las clases asignadas en curso y se muestra como tal en los listados.
- **Franja**: fecha, hora de inicio y hora de fin de una clase programada o de una solicitud.
- **Regla central**: un aula nunca puede tener dos clases en franjas superpuestas. Esta regla se verifica en cada asignación, en cada cambio de aula, en cada horario con aula habitual y en cada solicitud aprobada.

## RF-02 Gestión de aulas

**Quién**: Bedel.

**Flujo**

1. El bedel accede al listado de aulas y crea, edita o da de baja un aula.
2. El sistema valida que el código sea único, que la capacidad sea un entero entre 1 y 500 y que los campos obligatorios estén completos.
3. El sistema registra la operación con fecha, hora y usuario responsable.
4. Si el aula pasa a "Fuera de servicio" o "En mantenimiento" y tiene clases asignadas, el sistema advierte al bedel y lista las clases afectadas para reasignarlas (RF-16).
5. La baja es lógica: el aula deja de ofrecerse para asignaciones y se conserva en el historial.
6. Los cambios de estado y disponibilidad se publican en tiempo real.

**Salidas**: aula registrada o actualizada y visible en los listados de disponibilidad en menos de 60 segundos; confirmación; error ante código duplicado, capacidad inválida o datos incompletos; listado de clases afectadas cuando un aula deja de estar disponible.

## RF-06 Solicitud y selección de aula por el docente

**Quién**: Docente (también Bedel).

**Entrada**: clase o comisión, fecha y franja horaria, cantidad estimada de alumnos (entero mayor que 0), recursos requeridos (proyector, computadora, climatización, etc.) y comentario opcional.

**Flujo**

1. El docente indica fecha, franja, cantidad de alumnos y recursos.
2. El sistema filtra las aulas en estado "Disponible", sin asignaciones superpuestas en esa franja, con capacidad mayor o igual a la cantidad indicada y con todos los recursos requeridos.
3. Ordena los resultados por la capacidad más ajustada a la cantidad de alumnos.
4. El docente elige un aula y confirma la solicitud.
5. La solicitud queda "Pendiente" para aprobación de bedelía (RF-16). Excepción: si la clase no tiene aula asignada y la franja comienza en menos de 30 minutos, la solicitud nace en estado "Asignada", el aula queda reservada y aparece destacada como asignación inmediata en la pantalla de Solicitudes del bedel, que puede reasignarla si hace falta.
6. Si ninguna aula cumple todos los criterios, el sistema informa cuáles no se cumplen y sugiere aulas que cumplen parcialmente.

**Salidas**: listado de aulas que cumplen los filtros, actualizado al momento; solicitud registrada con estado Pendiente o Asignada; mensaje informativo si no hay aulas disponibles.

## RF-16 Asignación de aulas y aprobación de solicitudes

**Quién**: Bedel. La Autoridad académica asigna, mueve y reemplaza clases desde el Plano de aulas; las solicitudes siguen siendo del Bedel.

**Entrada**: solicitud pendiente (RF-06) o clase sin aula, aula, decisión (Aprobar / Rechazar) y motivo (obligatorio si se rechaza).

**Flujo**

1. El bedel consulta las solicitudes pendientes o las clases sin aula.
2. Al aprobar o asignar, el sistema verifica en una sola operación atómica que el aula siga disponible en esa franja; si otra operación la ocupó mientras tanto, rechaza la asignación.
3. El sistema registra la asignación y actualiza la ocupación del aula y el aula de la clase.
4. Si cambia el aula de una clase ya publicada, el sistema genera automáticamente una novedad de "Cambio de aula" (RF-05) visible para los estudiantes.
5. El sistema notifica al docente el resultado de su solicitud (aprobada, o rechazada con motivo).

**Reglas**

- Toda asignación que superponga un aula en la misma franja se rechaza con el mensaje "El aula ya está asignada en esa franja: la ocupa la comisión <código>" y no cambia nada.
- Desde el panel de un aula del Plano de aulas (solo clases de hoy), Bedel y Autoridad pueden:
  - **Asignar clase** (aula Disponible sin clase en la franja actual): se ofrecen las clases de hoy sin aula que admiten asignación, sin solicitud pendiente, con los estudiantes que siguen la comisión dentro de la capacidad y la franja libre en el aula. No genera novedad y los docentes reciben el correo de asignación. Con la franja en curso el aula pasa a "Pendiente"; con una franja futura sigue "Libre" y el panel muestra la clase como próxima.
  - **Mover a otra aula** (aula con clase en curso, también si está Fuera de servicio o En mantenimiento): se ofrecen las aulas Disponibles, libres en esa franja y con capacidad, agrupadas por piso. Publica un "Cambio de aula" y los docentes reciben el correo de reasignación; la original queda "Libre".
  - **Reemplazar clase** (aula Disponible con clase en curso): se elige la clase que entra y el aula adonde va la actual. Es todo o nada; solo la desplazada genera "Cambio de aula" y correo de reasignación, y la que entra recibe el correo de asignación.
  - Una clase terminada o en estado final se rechaza con "La clase ya no admite asignación de aula". Docente y Estudiante no ven las acciones y la API las rechaza (403 auditado). Todo queda en auditoría y en el histórico de asignaciones de aula.
- La pantalla de asignación muestra la ocupación actualizada para reducir el error humano.
- Asignar un aula y generar la novedad de cambio ocurre todo o nada.

**Salidas**: aula asignada y ocupación actualizada en tiempo real; notificación al docente; error ante superposición.

## RF-15 Incidencias de infraestructura

**Quién reporta**: Docente o Bedel. **Quién gestiona**: Bedel.

**Entrada**: aula, elemento afectado (proyector, climatización, iluminación, mobiliario, conectividad, otro), descripción (máximo 500 caracteres), gravedad (Leve / Impide el uso del aula) y foto opcional (JPG o PNG, máximo 5 MB; se comprime a 1 MB).

**Flujo**

1. El docente o el bedel registra la incidencia.
2. El sistema valida los datos y el formato y tamaño de la foto.
3. La incidencia queda en estado "Abierta" con fecha, hora y usuario.
4. Si la gravedad es "Impide el uso del aula", el sistema propone al bedel pasar el aula a "Fuera de servicio" (RF-02).
5. El bedel actualiza el estado (Abierta → En curso → Resuelta) y agrega observaciones. Al resolverla, puede volver a habilitar el aula.

**Reglas**: cada incidencia conserva el historial completo de estados con fecha, hora y usuario responsable (CA-06).

**Salidas**: incidencia visible en el listado de bedelía y en el detalle del aula; historial de estados; error ante datos incompletos o archivo inválido.

## Pantallas

- **Bedel**: Aulas (listado con estado y ocupación en tiempo real; alta, edición, baja; detalle con clases asignadas e incidencias); Solicitudes (pendientes, aprobar o rechazar con motivo); Asignar aula a clases sin aula; Incidencias (listado, cambio de estado, observaciones).
- **Docente**: Solicitar aula (filtros, resultados ordenados, confirmación); Mis solicitudes con su estado; Reportar incidencia desde la clase o el aula.
- **Estudiante**: ve el aula asignada en Mis clases (RF-07); no accede a este módulo.

## Fuera de alcance

- Reserva anticipada de aulas para eventos, consultas, recuperatorios o actividades especiales: requisito futuro.
- Derivación de incidencias a mantenimiento como órdenes de trabajo: requisito futuro.
