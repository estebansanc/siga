# Actividad docente

Registro digital de la presencia del docente en la institución, reemplazando la planilla en papel. El bedel genera un código QR por aula y turno; el docente lo escanea desde su teléfono y el sistema valida que esté físicamente en la institución. Como contingencia, el bedel puede registrar la asistencia a mano.

Requisitos cubiertos: RF-03, RF-04, RF-18. Criterios de aceptación: CA-02, CA-06. Fuente: ERS v1.0 §3.2.3, §3.2.4, §3.2.18. Riesgo asociado: QR fotografiado y reutilizado fuera de la institución (Riesgo 15).

## Conceptos

- **Turno**: Mañana, Tarde o Noche. Los rangos horarios son un parámetro de la institución, con valores iniciales Mañana 7:00 a 13:00, Tarde 13:00 a 18:00 y Noche 18:00 a 23:30.
- **Sesión de QR**: código generado por el bedel para un aula, una fecha y un turno. Contiene un token firmado con expiración.
- **Asistencia docente**: registro de presencia de un docente para una clase programada, con fecha, hora, método (QR o manual), resultado de la validación de ubicación y usuario registrante.
- **Presencia en la institución**: el dispositivo del docente está dentro de un radio configurable (200 m por defecto) de la sede, o conectado desde la red institucional. La ubicación es el mecanismo principal; la red institucional es la alternativa cuando el docente no da permiso de ubicación o la lectura falla; si ambas fallan, el docente recurre al registro manual por el bedel (RF-18).

## RF-03 Generación del QR de asistencia

**Quién**: Bedel.

**Entrada**: aula, fecha (por defecto la actual) y turno.

**Flujo**

1. El bedel elige el aula y el turno.
2. El sistema verifica que la institución esté "Abierta" o "Abierta con novedades" y que el aula tenga clases programadas en ese turno.
3. El sistema genera un token firmado, de un solo uso por docente, con aula, fecha, turno y momento de expiración, y lo muestra como QR.
4. El QR se renueva automáticamente cada 60 segundos mientras la pantalla permanece abierta, para que una foto o captura reenviada no sirva. Deja de ser válido al terminar el turno.
5. La generación queda en auditoría con fecha, hora y usuario.

**Reglas**

- Vigencia máxima de 60 segundos por código mostrado; ningún código se puede reutilizar.
- La pantalla muestra el QR en tamaño grande, con aula, turno y tiempo restante de validez, legible a por lo menos 50 cm (monitor, tablet o televisor en bedelía).

**Salidas**: QR vigente en pantalla; error si la institución está cerrada o el aula no tiene clases en ese turno.

## RF-04 Registro de asistencia por QR

**Quién**: Docente.

**Entrada**: token leído del QR, identidad del docente autenticado, ubicación del dispositivo (con su precisión) o dirección de la conexión.

**Flujo**

1. El docente abre "Registrar asistencia"; la cámara se activa directamente, sin pasos intermedios.
2. El sistema decodifica el QR y verifica que la firma sea válida y el token no esté vencido.
3. Verifica que el docente esté asignado a una comisión con clase programada en el aula y turno del QR.
4. Verifica que el dispositivo esté dentro de la institución: primero por ubicación dentro del radio; si no hay permiso o falla, por conexión desde la red institucional. Si ninguna valida, informa que debe pedir el registro manual al bedel.
5. Si todo es correcto, registra la asistencia con fecha, hora, aula, comisión y docente, y pasa la clase a "Docente presente".
6. No almacena las coordenadas del dispositivo: solo el resultado de la validación (dentro / fuera).
7. Si el docente ya registró asistencia para esa clase, informa el registro existente y no lo duplica.

**Reglas**

- Permisos de cámara y ubicación se piden solo en ese momento y con consentimiento explícito. No hay seguimiento continuo de ubicación.
- La validación completa (lectura, verificación y confirmación) tarda 5 segundos como máximo.
- Registrar la asistencia y cambiar el estado de la clase ocurre todo o nada.
- La asistencia no se usa para sanciones ni descuentos; solo para informar el estado de la clase y estadísticas.

**Salidas**: confirmación en pantalla con el detalle registrado; estado "Docente presente" visible para los estudiantes en menos de 60 segundos; errores específicos: QR vencido o inválido, docente sin clase en ese aula y turno, ubicación fuera de la institución, permisos de cámara o ubicación denegados, asistencia ya registrada.

## RF-18 Registro manual de asistencia (contingencia)

**Quién**: Bedel. Para cuando el docente no puede usar el QR (dispositivo sin cámara, sin batería, etc.).

**Entrada**: docente, clase programada, hora de llegada y motivo del registro manual (obligatorio).

**Flujo**

1. El bedel selecciona la clase y el docente presente.
2. El sistema verifica que no exista un registro de asistencia previo para esa clase.
3. Registra la asistencia marcada como "Registro manual", con motivo y bedel responsable, y pasa la clase a "Docente presente".

**Reglas**: el registro manual queda identificado como tal y se diferencia del QR en las consultas históricas (RF-09). No puede duplicarse para la misma clase.

**Salidas**: asistencia registrada; error si ya existe un registro para esa clase.

## Pantallas

- **Bedel**: QR de asistencia (selección de aula y turno; QR grande con aula, turno y cuenta regresiva); Registro manual (clase, docente, hora, motivo).
- **Docente**: Registrar asistencia (cámara directa, resultado con detalle o error específico).
- **Estudiante**: ve "Docente presente" en Mis clases (RF-07).

## Parámetros de la institución

Ubicación de la sede y radio de validación, identificación de la red institucional y rangos horarios de los turnos se configuran sin tocar código. Valores iniciales: sede de Rivadavia 1050, San Miguel de Tucumán, coordenadas −26.816955500941518, −65.19835580019078, y radio de 200 m, para tolerar la precisión del GPS en interiores.
