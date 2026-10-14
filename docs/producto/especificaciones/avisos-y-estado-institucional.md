# Avisos y estado institucional

Canal oficial de comunicación de la institución: si está abierta o cerrada, y los comunicados dirigidos a toda la comunidad o a un segmento. Incluye las preferencias del estudiante sobre qué comisiones sigue y si quiere recibir correos.

Requisitos cubiertos: RF-01, RF-08, RF-14, RF-17. Criterios de aceptación: CA-01, CA-03, CA-04. Fuente: ERS v1.0 §3.2.1, §3.2.8, §3.2.14, §3.2.17. Riesgo asociado: correos clasificados como spam (Riesgo 20); por eso todo aviso se publica también dentro de la aplicación.

## Conceptos

- **Estado institucional**: Abierta, Cerrada o Abierta con novedades (paro, corte de servicio, actividad parcial, etc.). Tiene motivo, fecha y hora, vigencia estimada y usuario responsable.
- **Aviso institucional**: comunicado oficial con título, cuerpo, prioridad (Normal / Urgente), destinatarios, vigencia y autor.
- **Segmento de destinatarios**: todos, o filtrado por perfil, carrera, año o comisión.
- **Preferencia de estudiante**: comisiones que sigue y si recibe por correo las novedades de esas comisiones y los avisos institucionales.

## RF-01 Registro de apertura y cierre de la institución

**Quién**: Bedel.

**Entrada**: estado (Abierta, Cerrada, Abierta con novedades), fecha y hora (se proponen las actuales), motivo o descripción (obligatorio para "Cerrada" y "Abierta con novedades", máximo 280 caracteres), vigencia estimada (opcional).

**Flujo**

1. El bedel selecciona el nuevo estado y completa los datos.
2. El sistema valida que el estado sea distinto al vigente y que el motivo esté completo cuando corresponde.
3. Registra el cambio con fecha, hora y usuario responsable y conserva el estado anterior en el historial.
4. Publica el nuevo estado a todos los perfiles en tiempo real.
5. Si el estado es "Cerrada" o "Abierta con novedades", ofrece al bedel generar un aviso institucional asociado (RF-14).

**Reglas**

- Al pasar a "Cerrada", las clases programadas afectadas pasan a "Suspendida" (ver estados de clase en `novedades.md`).
- Con la institución "Cerrada" no se pueden generar QR de asistencia (RF-03).

**Salidas**: estado actualizado y visible para todos los perfiles en menos de 60 segundos; confirmación; error si faltan datos obligatorios o el estado coincide con el vigente.

## RF-08 Visualización del estado institucional

**Quién**: todos los perfiles.

**Flujo**

1. En todas las pantallas se muestra un indicador destacado del estado institucional en la parte superior.
2. El indicador muestra el estado, la fecha y hora de la última actualización y, si corresponde, el motivo.
3. Ante un cambio, el indicador se actualiza solo en todas las sesiones abiertas.
4. Al tocar el indicador se accede al detalle y a los avisos institucionales vigentes. Los avisos urgentes se muestran también junto al indicador.

**Salidas**: indicador actualizado en menos de 60 segundos tras la acción del bedel.

## RF-14 Avisos institucionales y notificación

**Quién**: Bedel y Autoridad académica.

**Entrada**: título (máximo 100 caracteres), cuerpo (máximo 2.000 caracteres), prioridad (Normal / Urgente), destinatarios (todos o segmentados por perfil, carrera, año o comisión), vigencia desde/hasta, opción de enviar por correo.

**Flujo**

1. El usuario redacta el aviso y elige los destinatarios.
2. El sistema valida los campos obligatorios y que la vigencia sea coherente.
3. Publica el aviso en la sección Avisos de los destinatarios; si es urgente, también junto al indicador de estado institucional.
4. Si se eligió enviar por correo, envía el aviso a los destinatarios (a los estudiantes, solo si lo habilitaron en RF-17) y registra el resultado de cada envío.
5. Al vencer la vigencia, el aviso deja de mostrarse como activo y se conserva en el historial.

**Reglas**

- Los correos salen desde una dirección institucional reconocible, con contenido no promocional.
- Cada correo a un estudiante incluye un enlace para dejar de recibir notificaciones.
- Los mantenimientos programados del sistema se anuncian con un aviso institucional al menos 24 horas antes.

**Salidas**: aviso visible para los destinatarios en menos de 60 segundos; correos enviados y registro de entregas fallidas; error ante datos incompletos o vigencia inválida.

## RF-17 Preferencias de seguimiento y notificaciones del estudiante

**Quién**: Estudiante.

**Entrada**: comisiones seleccionadas (búsqueda por carrera, año y materia), notificaciones por correo de novedades (Sí/No) y de avisos institucionales (Sí/No).

**Flujo**

1. El estudiante busca y agrega o quita comisiones de su lista.
2. El sistema guarda las preferencias y las aplica como filtro por defecto en "Mis clases" (RF-07).
3. Al publicarse una novedad en una comisión seguida (RF-05) o un aviso dirigido al estudiante (RF-14), el sistema envía el correo solo si el estudiante lo habilitó.
4. Cada correo incluye un enlace para dejar de recibir notificaciones. Se envía un correo por cada novedad o aviso; no se agrupan.

**Salidas**: preferencias guardadas y confirmadas; "Mis clases" filtrado por las comisiones seguidas.

## Pantallas

- **Todos**: indicador de estado institucional en la parte superior; detalle con avisos vigentes; sección Avisos.
- **Bedel**: Estado institucional (cambio de estado con motivo y vigencia; historial); Avisos (redactar, segmentar, publicar, enviar por correo, ver resultado de envíos).
- **Autoridad académica**: Avisos (igual que Bedel).
- **Estudiante**: Preferencias (comisiones seguidas, notificaciones por correo).

## Fuera de alcance

- Notificaciones push por PWA y canales como Telegram o WhatsApp: requisitos futuros. SMS y mensajería paga: excluidos por restricción.
