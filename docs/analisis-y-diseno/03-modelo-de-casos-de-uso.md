# Modelo de casos de uso

Especificación de cada caso de uso del diagrama (`02-diagrama-de-casos-de-uso.md`) en formato expandido de Larman: actor principal, precondiciones, flujo principal (escenario de éxito), extensiones (flujos alternativos, numeradas por el paso al que aplican, `*` cuando aplican a cualquier paso) y postcondiciones (garantía de éxito). Cada caso referencia el requisito que lo origina y, cuando tiene diseño de pantalla, el caso de uso real (`07-casos-de-uso-reales.md`) y el diagrama de colaboración (`08-diagramas-de-colaboracion.md`).

Reglas comunes a todos los casos de uso, que no se repiten en cada uno:

- **Autorización**: salvo CU-01, CU-03, CU-04, CU-05 y CU-07, el actor tiene una sesión válida. El servidor verifica el permiso del perfil en cada operación; si no lo tiene, responde "Acceso denegado" y lo registra en auditoría (CU-37). Un acceso sin sesión válida redirige al inicio de sesión.
- **Auditoría**: toda operación que crea o cambia datos queda en el registro de auditoría con fecha, hora, usuario, perfil, acción, entidad y valores anteriores y nuevos (CU-37). No se repite como postcondición.
- **Tiempo real**: todo cambio visible para otros usuarios se refleja en sus pantallas abiertas en 60 segundos como máximo, sin recargar.
- **Validación**: los errores de datos se muestran junto al campo, en español, sin perder lo cargado.

## Resumen

| Módulo                         | Casos de uso    | Hito (`../producto/vision.md`)                 |
| ------------------------------ | --------------- | ---------------------------------------------- |
| Usuarios y roles               | CU-01 a CU-10   | Base de todos los módulos                      |
| Novedades                      | CU-11 a CU-15, CU-38 | 12/10/2026                                |
| Aulas y espacios               | CU-16 a CU-23   | 29/10/2026                                     |
| Actividad docente              | CU-24 a CU-28   | 29/10/2026                                     |
| Avisos y estado institucional  | CU-29 a CU-34   | 29/10/2026                                     |
| Histórico y consultas          | CU-35 a CU-37   | MVP 10/11/2026                                 |

## Módulo Usuarios y roles

### CU-01 Iniciar sesión

- **Actor principal**: Usuario (cualquier perfil). **RF-11**. Pantalla M1 (CUR-01).
- **Precondiciones**: el usuario tiene una cuenta con contraseña definida y, si es estudiante autorregistrado, correo verificado.
- **Flujo principal**:
  1. El usuario ingresa correo y contraseña.
  2. El sistema verifica las credenciales, que la cuenta esté activa y que no esté bloqueada.
  3. El sistema abre una sesión que vence tras 8 horas de inactividad y registra el inicio en auditoría.
  4. El sistema muestra el panel principal del perfil: Mis clases (Estudiante y Docente), panel operativo (Bedel) o Consultas históricas (Autoridad).
- **Extensiones**:
  - 2a. Credenciales incorrectas: muestra "Correo o contraseña incorrectos", sin indicar cuál dato falló, y cuenta el intento.
  - 2b. Quinto intento fallido consecutivo: bloquea la cuenta 15 minutos e informa "Cuenta bloqueada temporalmente".
  - 2c. Cuenta desactivada: informa que la cuenta está desactivada y a quién recurrir.
  - 2d. Correo sin verificar: informa y ofrece reenviar el enlace de verificación (CU-05).
  - 3a. Primer ingreso: muestra la política de privacidad; el usuario debe aceptarla para continuar y queda registrada la aceptación.
- **Postcondiciones**: sesión abierta; último acceso actualizado.

### CU-02 Cerrar sesión

- **Actor principal**: Usuario. **RF-11**.
- **Precondiciones**: sesión abierta.
- **Flujo principal**:
  1. El usuario elige "Cerrar sesión".
  2. El sistema invalida la sesión y vuelve al inicio de sesión.
- **Extensiones**:
  - \*a. Sesión vencida por inactividad: el sistema la invalida por sí solo y, en el próximo acceso, redirige al inicio de sesión.
- **Postcondiciones**: la sesión no sirve para ninguna operación.

### CU-03 Recuperar contraseña

- **Actor principal**: Usuario. **RF-12**.
- **Precondiciones**: ninguna.
- **Flujo principal**:
  1. El usuario elige "Olvidé mi contraseña" e ingresa su correo.
  2. El sistema responde siempre "Si el correo está registrado, recibirás un enlace".
  3. Si el correo pertenece a una cuenta activa, el sistema envía un enlace de un solo uso válido por 60 minutos.
  4. El usuario abre el enlace, define una contraseña nueva (mínimo 8 caracteres, con letras y números) y la confirma.
  5. El sistema actualiza la contraseña, invalida el enlace y cierra todas las sesiones abiertas del usuario.
  6. El sistema confirma y lleva al inicio de sesión.
- **Extensiones**:
  - 3a. Correo no registrado o cuenta desactivada: no envía nada; la respuesta del paso 2 no cambia.
  - 4a. Enlace vencido o ya usado: informa "El enlace ya no es válido" y ofrece pedir uno nuevo.
  - 4b. Contraseña que no cumple la política o confirmación distinta: error junto al campo.
- **Postcondiciones**: contraseña nueva; sesiones anteriores invalidadas.

### CU-04 Registrarse como estudiante

- **Actor principal**: Estudiante. **RF-10**, decisión 1.
- **Precondiciones**: ninguna.
- **Flujo principal**:
  1. El estudiante abre "Registrarme" y completa apellido, nombre, DNI, correo, legajo (opcional) y contraseña.
  2. El sistema valida el formato del correo, que el DNI tenga 7 u 8 dígitos, que correo y DNI no estén registrados, que la contraseña cumpla la política y, si la institución configuró dominios permitidos, que el correo pertenezca a uno de ellos.
  3. El sistema crea la cuenta con perfil Estudiante, sin verificar.
  4. Incluye CU-05: envía el enlace de verificación e informa que debe verificar el correo antes de ingresar.
- **Extensiones**:
  - 2a. Correo o DNI ya registrado: informa el duplicado. Si la cuenta existe y no está verificada, ofrece reenviar el enlace.
  - 2b. Dominio no permitido: informa qué dominios acepta la institución.
- **Postcondiciones**: cuenta creada con perfil Estudiante; no puede iniciar sesión hasta verificar.

### CU-05 Verificar correo

- **Actor principal**: Estudiante. **RF-10**.
- **Precondiciones**: cuenta creada por CU-04 y sin verificar.
- **Flujo principal**:
  1. El estudiante abre el enlace de verificación recibido por correo.
  2. El sistema valida el enlace y marca el correo como verificado.
  3. El sistema confirma y lleva al inicio de sesión.
- **Extensiones**:
  - 1a. Enlace vencido o inválido: informa y ofrece reenviar uno nuevo al correo registrado.
- **Postcondiciones**: el estudiante puede iniciar sesión.

### CU-06 Administrar usuarios

- **Actor principal**: Bedel o Autoridad académica. **RF-10**. Pantalla D7 (CUR-14).
- **Precondiciones**: sesión con permiso de administración.
- **Flujo principal**:
  1. El administrador abre Usuarios, busca por nombre, DNI, correo o perfil, y elige crear o editar.
  2. Completa apellido, nombre, DNI, correo, legajo (opcional), perfil y, si el perfil es Docente, las comisiones asignadas.
  3. El sistema valida el formato del correo, que el DNI tenga 7 u 8 dígitos y que correo y DNI no estén registrados en otro usuario.
  4. El sistema guarda el usuario con su perfil y permisos.
  5. Si es un alta, incluye CU-07: envía el correo con el enlace para definir la contraseña.
  6. El sistema confirma y vuelve al listado.
- **Extensiones**:
  - 1a. Desactivar: el administrador elige "Desactivar" y confirma; el sistema marca al usuario inactivo, invalida sus sesiones y conserva todos sus registros.
  - 1b. Reactivar un usuario inactivo: el sistema lo vuelve a habilitar sin tocar su historial.
  - 3a. Correo o DNI duplicado: error junto al campo.
  - 4a. Quitar una comisión a un docente con clases futuras: el sistema lo advierte; las clases siguen existiendo y quedan sin docente que pueda registrar asistencia hasta que se asigne otro.
- **Postcondiciones**: usuario creado o actualizado; correo de activación enviado si es alta.

### CU-07 Definir contraseña por enlace

- **Actor principal**: Usuario nuevo. **RF-10**.
- **Precondiciones**: alta hecha por CU-06; enlace de activación válido por 24 horas.
- **Flujo principal**:
  1. El usuario abre el enlace de activación.
  2. El sistema valida el enlace y muestra el formulario de contraseña.
  3. El usuario define y confirma su contraseña (mínimo 8 caracteres, con letras y números).
  4. El sistema la guarda, invalida el enlace y lleva al inicio de sesión.
- **Extensiones**:
  - 2a. Enlace vencido o usado: informa y ofrece pedir uno nuevo, que llega al mismo correo.
  - 3a. Contraseña que no cumple la política: error junto al campo.
- **Postcondiciones**: el usuario puede iniciar sesión.

### CU-08 Mantener datos académicos base

- **Actor principal**: Bedel (también Autoridad académica). **RF-13**, decisiones 5 y 6. Pantalla D7 (CUR-14).
- **Precondiciones**: sesión con permiso de administración.
- **Flujo principal**:
  1. El bedel abre Datos académicos y elige la entidad: carreras, materias, comisiones, horarios, períodos lectivos o días no laborables.
  2. Crea o edita un registro con los datos de la entidad (tabla en `../producto/especificaciones/usuarios-y-roles.md`).
  3. El sistema valida: códigos únicos; hora de fin posterior a la de inicio en horarios y períodos; en comisiones, al menos un docente y todos con perfil Docente; en horarios con aula habitual, que el aula no tenga otra comisión en esa franja semanal.
  4. El sistema guarda el registro y confirma.
  5. Si la entidad afecta a las clases de una comisión (horario, período, día no laborable), ofrece generar o regenerar las clases (CU-09).
- **Extensiones**:
  - 1a. Baja de una comisión: es lógica; la comisión deja de ofrecerse y conserva su historial.
  - 3a. Código duplicado, horario inválido o aula habitual superpuesta: error con el detalle (qué comisión ocupa esa franja).
- **Postcondiciones**: datos base registrados; clases generadas si el bedel lo eligió.

### CU-09 Generar clases programadas

- **Actor principal**: Bedel (incluido desde CU-08). **RF-13**, CA-09.
- **Precondiciones**: la comisión tiene período lectivo y al menos un horario.
- **Flujo principal**:
  1. El bedel elige la comisión (o todas las de un período) y confirma la generación.
  2. Por cada horario, el sistema recorre las fechas entre el inicio y el fin del período, salteando los días no laborables.
  3. Por cada fecha crea una clase Programada con la hora de inicio y fin del horario y el aula habitual asignada, siempre que no exista ya una clase de esa comisión en esa fecha y franja.
  4. El sistema verifica que ninguna clase generada superponga un aula con otra clase en la misma franja.
  5. El sistema informa cuántas clases creó y cuántas ya existían.
- **Extensiones**:
  - 3a. El aula habitual no está disponible o fue dada de baja: la clase se crea sin aula y aparece en "Clases sin aula" para CU-20.
  - 4a. Superposición de aula: la clase se crea sin aula y se lista como afectada, para que el bedel la asigne con CU-20.
  - 2a. Período ya vencido: informa que no hay fechas futuras y no genera nada.
- **Postcondiciones**: una clase Programada por comisión, fecha y franja dentro del período; ninguna superposición de aulas.

### CU-10 Editar mi perfil

- **Actor principal**: Usuario. **PRI-4** (`../producto/requerimientos.md`).
- **Precondiciones**: sesión abierta.
- **Flujo principal**:
  1. El usuario abre Mi perfil y ve sus datos: apellido, nombre, DNI, correo, legajo, perfil.
  2. Corrige los datos editables (apellido, nombre, legajo) y guarda.
  3. El sistema valida y confirma.
- **Extensiones**:
  - 2a. Cambio de contraseña: pide la actual y la nueva; aplica la política; cierra las demás sesiones.
  - 2b. Solicitar baja de la cuenta: el usuario confirma; el sistema registra la solicitud, desactiva la cuenta y conserva el historial según la política de privacidad.
  - 2c. DNI, correo o perfil: no son editables por el propio usuario; se indica a quién pedir el cambio.
- **Postcondiciones**: datos actualizados; baja registrada si la pidió.

## Módulo Novedades

### CU-11 Consultar mis clases de hoy

- **Actor principal**: Estudiante (también Docente, con sus propias clases). **RF-07**, US-1. Pantalla M2 (CUR-02); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: sesión abierta.
- **Flujo principal**:
  1. El estudiante entra; Mis clases es su panel principal.
  2. El sistema toma las comisiones seguidas (CU-33) y la fecha de hoy como filtros.
  3. El sistema muestra arriba el indicador de estado institucional (CU-30) y, por cada clase: materia, comisión, horario, aula asignada, estado del docente (Sin registrar, Presente, Demorado, Ausente) y novedades activas, con color, icono y texto.
  4. La vista se actualiza sola ante cualquier cambio.
- **Extensiones**:
  - 2a. Sin comisiones seguidas: invita a configurarlas (CU-33) y ofrece la búsqueda (CU-12).
  - 3a. Institución Cerrada: lo indica de forma destacada antes del listado.
  - 3b. Sin clases para hoy: "No se encontraron clases".
  - 1a. Docente: ve sus propias clases, con acceso directo a publicar novedad (CU-13) y registrar asistencia (CU-26).
- **Postcondiciones**: ninguna (consulta).
- **Requisitos especiales**: llegar al estado de las clases de hoy en no más de 2 interacciones desde el inicio de sesión; latencia máxima 60 segundos, objetivo 5.

### CU-12 Buscar clases con filtros

- **Actor principal**: Estudiante (también Docente, Bedel y Autoridad). **RF-07**.
- **Precondiciones**: sesión abierta.
- **Flujo principal**:
  1. El usuario abre la búsqueda de clases.
  2. Elige filtros combinables: carrera, año, comisión, materia y fecha (hoy por defecto).
  3. El sistema aplica los filtros sobre las clases programadas y muestra el mismo detalle por clase que CU-11.
- **Extensiones**:
  - 3a. Sin resultados: "No se encontraron clases".
  - 2a. El estudiante elige "Seguir" sobre una comisión del resultado: se agrega a sus comisiones seguidas (CU-33).
- **Postcondiciones**: ninguna (consulta).

### CU-13 Publicar novedad de clase

- **Actor principal**: Docente, sobre sus clases; Bedel, sobre cualquier clase. **RF-05**, CA-03, US-2, decisiones 2, 7 y 12. Pantallas M5 y M6 (CUR-05); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: la comisión tiene clases programadas no finalizadas.
- **Flujo principal**:
  1. El docente elige la comisión y una fecha o un rango de fechas; el sistema lista las clases que abarca.
  2. Elige el tipo: Ausencia, Demora, Cambio de modalidad (virtual), Suspensión o Cambio de aula, y completa el dato obligatorio del tipo (minutos de demora, enlace a la clase virtual, o aula nueva elegida entre las disponibles en ese horario) y un mensaje opcional de hasta 500 caracteres.
  3. Revisa el resumen y confirma.
  4. El sistema valida que las clases pertenezcan a una comisión del docente (o que el actor sea bedel), que ninguna esté Finalizada, Ausente ni Suspendida, y que el dato del tipo sea válido.
  5. Para Cambio de aula, verifica en una sola operación que el aula nueva siga libre en cada franja y la reserva.
  6. El sistema registra la novedad con fecha, hora y usuario (marcando si la publicó bedelía) y actualiza el estado de cada clase según el tipo (`../producto/requerimientos.md`, "Estados de una clase programada").
  7. El sistema publica la novedad en tiempo real e incluye CU-15.
  8. El sistema confirma al docente con el resumen de lo publicado.
- **Extensiones**:
  - 4a. Alguna clase ya está Finalizada, Ausente o Suspendida: informa cuál y no publica nada.
  - 4b. La comisión no es del docente: "Acceso denegado" y auditoría.
  - 4c. Enlace inválido, minutos no numéricos o mensaje mayor a 500 caracteres: error junto al campo.
  - 5a. El aula nueva ya está asignada en alguna franja: "El aula ya está asignada en esa franja", y ofrece elegir otra.
- **Postcondiciones**: una sola novedad Activa que abarca todas las clases elegidas; estados y aula actualizados; un correo por estudiante suscripto encolado.
- **Requisitos especiales**: publicar lleva menos de 1 minuto y no más de 4 pasos; la novedad nunca expone el motivo personal de una ausencia.

### CU-14 Editar o finalizar novedad

- **Actor principal**: Docente (sus novedades) o Bedel. **RF-05**, decisión 17.
- **Precondiciones**: novedad Activa.
- **Flujo principal**:
  1. El docente abre su listado de novedades y elige una.
  2. Edita el dato del tipo o el mensaje y guarda, o elige "Finalizar".
  3. El sistema valida como en CU-13 y registra el cambio como una versión nueva en el historial; nada se borra.
  4. Si finalizó una Demora o un Cambio de modalidad, las clases afectadas que no tengan asistencia registrada vuelven a Programada. Un Cambio de aula finalizado restituye el aula anterior si sigue libre.
  5. El sistema publica el cambio en tiempo real e incluye CU-15 cuando el cambio afecta lo que ven los estudiantes.
- **Extensiones**:
  - 2a. Novedad de Ausencia o Suspensión: no se finaliza, porque la clase quedó en estado final; solo se edita el mensaje. Si fue un error, el bedel lo resuelve con una novedad nueva o una asistencia manual (CU-28) y el caso queda en el historial.
  - 4a. El aula anterior ya no está libre: la clase queda sin aula y se lista para CU-20.
- **Postcondiciones**: novedad actualizada o Finalizada con historial completo; estados de clase coherentes.

### CU-15 Notificar novedad por correo

- **Actor principal**: Sistema (incluido desde CU-13, CU-14 y CU-23). **RF-05, RF-17**, decisión 12.
- **Precondiciones**: novedad registrada.
- **Flujo principal**:
  1. El sistema obtiene los estudiantes que siguen la comisión y tienen activado el correo de novedades.
  2. Por cada uno encola un correo con tipo, clases afectadas, mensaje, quién publicó y un enlace para dejar de recibir notificaciones.
  3. El servicio de correo entrega cada mensaje; el sistema registra la notificación con su resultado.
- **Extensiones**:
  - 3a. Entrega fallida: reintenta y, si sigue fallando, registra el fallo; la novedad sigue visible en la aplicación.
- **Postcondiciones**: una notificación por estudiante suscripto, con resultado registrado.

### CU-38 Finalizar clases al terminar la franja

- **Actor principal**: Reloj del sistema. **RF-07**, decisión 4.
- **Precondiciones**: clases cuya hora de fin ya pasó y que siguen Programada, Demorada, Docente presente o Virtual.
- **Flujo principal**:
  1. Al terminar la franja de una clase, el sistema la pasa a Finalizada.
  2. Si la clase seguía Programada o Demorada, queda Finalizada sin registro de asistencia docente, y así se cuenta en el histórico.
  3. Las novedades activas de la clase quedan sin efecto sobre pantallas futuras y se conservan.
- **Extensiones**: ninguna.
- **Postcondiciones**: ninguna clase pasada queda en un estado no final.

## Módulo Aulas y espacios

### CU-16 Gestionar aulas

- **Actor principal**: Bedel. **RF-02**, decisión 9. Pantalla D2 (CUR-09).
- **Precondiciones**: sesión de Bedel.
- **Flujo principal**:
  1. El bedel abre Aulas: listado con estado editable y ocupación en tiempo real.
  2. Crea o edita un aula: código, edificio, piso, capacidad, equipamiento, estado, observaciones.
  3. El sistema valida código único, capacidad entera entre 1 y 500 y campos obligatorios.
  4. El sistema guarda, registra fecha, hora y usuario, confirma y publica el cambio.
- **Extensiones**:
  - 2a. Baja: es lógica; el aula deja de ofrecerse y se conserva en el historial. Si tiene clases futuras asignadas, aplica 4a.
  - 3a. Código duplicado, capacidad inválida o datos incompletos: error junto al campo.
  - 4a. El aula pasa a Fuera de servicio o En mantenimiento con clases asignadas: el sistema lista las clases afectadas y ofrece reasignarlas (CU-20).
- **Postcondiciones**: aula creada o actualizada y visible en los listados de disponibilidad en menos de 60 segundos.

### CU-17 Buscar aulas disponibles

- **Actor principal**: Docente (incluido desde CU-18); también Bedel. **RF-06**.
- **Precondiciones**: ninguna además de la sesión.
- **Flujo principal**:
  1. El docente indica fecha, franja horaria, cantidad estimada de alumnos (mayor que 0) y recursos requeridos.
  2. El sistema filtra las aulas activas en estado Disponible, sin clases ni solicitudes asignadas que se superpongan con la franja, con capacidad mayor o igual a la cantidad y con todos los recursos pedidos.
  3. El sistema ordena por capacidad más ajustada a la cantidad de alumnos y muestra el resultado actualizado al momento.
- **Extensiones**:
  - 3a. Ninguna aula cumple todos los criterios: informa cuáles no se cumplen y sugiere aulas que cumplen parcialmente (por ejemplo, sin un recurso o con menos capacidad).
- **Postcondiciones**: ninguna (consulta).

### CU-18 Solicitar aula

- **Actor principal**: Docente. **RF-06**, decisión 8. Pantalla M8 (CUR-07); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: el docente tiene una clase programada para la fecha y franja.
- **Flujo principal**:
  1. El docente elige la clase (o comisión, fecha y franja) y completa cantidad de alumnos, recursos y comentario opcional.
  2. Incluye CU-17: el sistema muestra las aulas que cumplen.
  3. El docente elige un aula y confirma.
  4. El sistema registra la solicitud en estado Pendiente con fecha, hora y docente.
  5. El sistema confirma y la muestra en Mis solicitudes; la solicitud aparece en Solicitudes del bedel (CU-19).
- **Extensiones**:
  - 4a. La clase no tiene aula asignada y la franja empieza en menos de 30 minutos: la solicitud nace Asignada, el aula queda reservada para esa clase (verificación atómica de INV-1), se marca como inmediata y se destaca en Solicitudes del bedel, que puede reasignarla.
  - 4b. Ya existe una solicitud Pendiente del docente para esa clase: informa y ofrece editarla o cancelarla.
  - 3a. El aula elegida se ocupó mientras el docente decidía: "El aula ya está asignada en esa franja", y vuelve al paso 2 con el listado actualizado.
- **Postcondiciones**: solicitud registrada, Pendiente o Asignada.

### CU-19 Aprobar o rechazar solicitud

- **Actor principal**: Bedel. **RF-16**, CA-04, Riesgo 17. Pantalla D4 (CUR-11); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: existe una solicitud Pendiente (o Asignada inmediata, para reasignar).
- **Flujo principal**:
  1. El bedel abre Solicitudes y ve las pendientes con clase, docente, franja, aula pedida, alumnos y recursos, y las inmediatas destacadas.
  2. Elige una y la aprueba.
  3. El sistema verifica en una sola operación atómica que el aula siga libre en esa franja y la asigna a la clase.
  4. Si la clase ya tenía otra aula, extiende CU-23 (novedad de cambio de aula).
  5. El sistema marca la solicitud Asignada, registra fecha, hora y bedel, notifica al docente y actualiza la ocupación en tiempo real.
- **Extensiones**:
  - 2a. Rechazar: el bedel ingresa el motivo (obligatorio); el sistema marca la solicitud Rechazada y notifica al docente con el motivo.
  - 2b. Aprobar con otra aula: el bedel elige una distinta entre las disponibles; sigue en el paso 3 con esa aula.
  - 3a. Otra operación ocupó el aula entre tanto: "El aula ya está asignada en esa franja"; la solicitud sigue Pendiente y el listado se actualiza.
  - 1a. Reasignar una inmediata: el bedel elige otra aula; aplica el paso 3 y CU-23.
- **Postcondiciones**: solicitud Asignada o Rechazada; aula de la clase y ocupación actualizadas; docente notificado.
- **Requisitos especiales**: asignar el aula y generar la novedad de cambio ocurre todo o nada.

### CU-20 Asignar aula a clase

- **Actor principal**: Bedel. **RF-16**, CA-04. Pantallas D2 y D4.
- **Precondiciones**: existe una clase sin aula, o una clase cuya aula debe cambiar.
- **Flujo principal**:
  1. El bedel abre Clases sin aula (o el detalle de una clase) y elige una.
  2. El sistema muestra las aulas disponibles en esa franja con su ocupación actualizada.
  3. El bedel elige un aula y confirma.
  4. El sistema verifica de forma atómica que el aula siga libre y la asigna.
  5. Si la clase tenía otra aula, extiende CU-23.
  6. El sistema confirma y actualiza la ocupación en tiempo real.
- **Extensiones**:
  - 4a. Superposición: "El aula ya está asignada en esa franja"; vuelve al paso 2.
  - 1a. Asignación masiva tras una baja de aula (desde CU-16 4a): el bedel recorre las clases afectadas una por una con este mismo flujo.
- **Postcondiciones**: clase con aula asignada sin superposición.

### CU-21 Reportar incidencia

- **Actor principal**: Docente o Bedel. **RF-15**.
- **Precondiciones**: el aula existe.
- **Flujo principal**:
  1. El usuario abre "Reportar incidencia" desde la clase o desde el aula.
  2. Completa elemento afectado, descripción (hasta 500 caracteres), gravedad (Leve o Impide el uso del aula) y foto opcional (JPG o PNG, hasta 5 MB).
  3. El sistema valida los datos y el formato y tamaño de la foto, y la comprime a 1 MB.
  4. El sistema registra la incidencia Abierta con fecha, hora y usuario, y la muestra en el listado de bedelía y en el detalle del aula.
  5. Si la gravedad es "Impide el uso del aula", propone al bedel poner el aula Fuera de servicio (CU-16).
- **Extensiones**:
  - 3a. Datos incompletos o archivo inválido: error junto al campo.
- **Postcondiciones**: incidencia Abierta con su primer registro de historial.

### CU-22 Gestionar incidencia

- **Actor principal**: Bedel. **RF-15**, CA-06. Pantalla D5 (CUR-12).
- **Precondiciones**: existe una incidencia no Resuelta.
- **Flujo principal**:
  1. El bedel abre Incidencias, filtra por aula, estado o gravedad y elige una.
  2. Cambia el estado (Abierta → En curso → Resuelta) y agrega una observación.
  3. El sistema agrega el cambio al historial con fecha, hora y usuario; nunca reemplaza un registro anterior.
  4. Al resolver, el sistema ofrece volver a habilitar el aula si estaba Fuera de servicio por esta incidencia (CU-16).
- **Extensiones**:
  - 2a. Transición no permitida (por ejemplo, Resuelta → Abierta): el sistema la rechaza; si el problema reaparece se reporta una incidencia nueva (CU-21).
- **Postcondiciones**: historial de estados completo e inmutable.

### CU-23 Generar novedad de cambio de aula

- **Actor principal**: Sistema (extensión de CU-19 y CU-20). **RF-16, RF-05**.
- **Precondiciones**: cambió el aula de una clase programada no finalizada.
- **Flujo principal**:
  1. El sistema crea una novedad de tipo Cambio de aula sobre la clase, con el aula nueva, publicada por bedelía, en la misma transacción que la asignación.
  2. Incluye CU-15 para notificar a los estudiantes suscriptos.
- **Extensiones**:
  - 1a. La asignación falla: no se crea la novedad (todo o nada).
- **Postcondiciones**: los estudiantes ven el aula nueva y la novedad en Mis clases.

## Módulo Actividad docente

### CU-24 Generar QR de asistencia

- **Actor principal**: Bedel. **RF-03**, CA-02, Riesgo 15. Pantalla D3 (CUR-10); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: institución Abierta o Abierta con novedades.
- **Flujo principal**:
  1. El bedel elige aula, fecha (hoy por defecto) y turno.
  2. El sistema verifica el estado institucional y que el aula tenga clases programadas en ese turno.
  3. El sistema crea la sesión de QR, genera un token firmado con aula, fecha, turno y expiración, y lo muestra como QR grande con aula, turno y tiempo restante.
  4. Incluye CU-25 mientras la pantalla permanece abierta.
  5. La generación queda en auditoría.
- **Extensiones**:
  - 2a. Institución Cerrada: "No se pueden generar códigos con la institución cerrada".
  - 2b. Aula sin clases en ese turno: informa y no genera.
  - 3a. Ya hay una sesión vigente para esa aula, fecha y turno: la reutiliza en lugar de crear otra.
- **Postcondiciones**: QR vigente en pantalla, legible a 50 cm.

### CU-25 Renovar QR cada 60 s

- **Actor principal**: Reloj del sistema (incluido desde CU-24). **RF-03**.
- **Precondiciones**: sesión de QR en pantalla.
- **Flujo principal**:
  1. Cada 60 segundos el sistema genera un token nuevo, invalida el anterior y actualiza el QR y la cuenta regresiva.
  2. Al terminar el turno, el sistema deja de renovar y marca la sesión como vencida.
- **Extensiones**:
  - 1a. La pantalla pierde conexión: muestra que el código puede no ser válido y reintenta.
- **Postcondiciones**: ningún token vale más de 60 segundos ni después del fin del turno.

### CU-26 Registrar asistencia por QR

- **Actor principal**: Docente. **RF-04**, CA-02. Pantalla M7 (CUR-06); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: el docente tiene una clase programada en el aula y turno del QR; hay un QR vigente.
- **Flujo principal**:
  1. El docente abre "Registrar asistencia"; la cámara se activa directamente, previo consentimiento del permiso.
  2. El docente apunta al QR; el sistema decodifica el token.
  3. El sistema verifica la firma y que el token no esté vencido ni usado por este docente.
  4. El sistema verifica que el docente esté asignado a una comisión con clase programada en ese aula y turno, y que la clase no tenga asistencia.
  5. Incluye CU-27: valida la presencia en la institución.
  6. El sistema registra la asistencia (fecha, hora, aula, comisión, docente, método QR, resultado de la validación) y pasa la clase a Docente presente, todo en una operación.
  7. El sistema confirma en pantalla con el detalle registrado.
- **Extensiones**:
  - 1a. Permiso de cámara denegado: explica cómo habilitarlo y ofrece el registro manual por el bedel (CU-28).
  - 3a. Token vencido, inválido o reutilizado: "QR vencido o inválido, pedí uno nuevo en bedelía".
  - 4a. Sin clase en ese aula y turno: "No tenés clase en esta aula en este turno".
  - 4b. Asistencia ya registrada: muestra el registro existente y no lo duplica.
  - 5a. Presencia no validada: "No pudimos confirmar que estés en la institución; pedí el registro manual al bedel".
  - 4c. Más de una clase del docente en ese aula y turno: el sistema registra la asistencia para la clase en curso o la próxima a empezar.
- **Postcondiciones**: una asistencia por QR para la clase; clase en Docente presente, visible para los estudiantes en menos de 60 segundos.
- **Requisitos especiales**: lectura, verificación y confirmación en 5 segundos como máximo; no se almacenan coordenadas.

### CU-27 Validar presencia en la institución

- **Actor principal**: Sistema (incluido desde CU-26). **RF-04**, decisiones 10 y 11.
- **Precondiciones**: ubicación del dispositivo (con su precisión) o dirección de la conexión.
- **Flujo principal**:
  1. El sistema pide la ubicación del dispositivo con consentimiento explícito, solo en ese momento.
  2. Calcula la distancia a la sede y la compara con el radio configurado (200 m inicial).
  3. Si está dentro, devuelve "dentro, por ubicación".
- **Extensiones**:
  - 1a. Permiso denegado o lectura fallida: verifica si la conexión viene de la red institucional; si sí, devuelve "dentro, por red institucional".
  - 2a. Fuera del radio: verifica la red institucional como en 1a.
  - 1b. Ni ubicación ni red validan: devuelve "fuera" y CU-26 informa el registro manual.
- **Postcondiciones**: resultado de validación (dentro por ubicación, dentro por red, fuera) sin guardar coordenadas.

### CU-28 Registrar asistencia manual

- **Actor principal**: Bedel. **RF-18**.
- **Precondiciones**: el docente está presente y no pudo usar el QR; la clase no tiene asistencia registrada.
- **Flujo principal**:
  1. El bedel abre Registro manual y elige la clase y el docente presente.
  2. Completa la hora de llegada (actual por defecto) y el motivo del registro manual (obligatorio).
  3. El sistema verifica que no exista asistencia para esa clase.
  4. El sistema registra la asistencia con método Manual, motivo y bedel responsable, y pasa la clase a Docente presente, todo en una operación.
  5. El sistema confirma.
- **Extensiones**:
  - 3a. Ya existe asistencia: muestra el registro existente y no duplica.
  - 2a. Motivo vacío: error junto al campo.
- **Postcondiciones**: asistencia identificada como manual, diferenciada del QR en el histórico.

## Módulo Avisos y estado institucional

### CU-29 Registrar apertura y cierre

- **Actor principal**: Bedel. **RF-01**, CA-01. Pantalla D1 (CUR-08); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: sesión de Bedel.
- **Flujo principal**:
  1. El bedel abre Estado institucional, ve el vigente y el historial, y elige el nuevo estado: Abierta, Cerrada o Abierta con novedades.
  2. Completa fecha y hora (actuales por defecto), motivo (obligatorio salvo Abierta, hasta 280 caracteres) y vigencia estimada opcional.
  3. El sistema valida que el estado sea distinto del vigente y que el motivo esté cuando corresponde.
  4. El sistema registra el estado nuevo con usuario responsable y conserva el anterior en el historial.
  5. Si el estado es Cerrada, incluye CU-34.
  6. El sistema publica el estado a todos los perfiles en tiempo real (CU-30).
  7. Si el estado es Cerrada o Abierta con novedades, extiende CU-31: ofrece redactar un aviso asociado con el motivo precargado.
- **Extensiones**:
  - 3a. Estado igual al vigente o motivo faltante: error.
  - 7a. El bedel no quiere publicar aviso: termina sin aviso.
- **Postcondiciones**: estado vigente actualizado y visible en menos de 60 segundos; clases suspendidas si cerró; con la institución Cerrada no se generan QR.

### CU-30 Ver estado institucional

- **Actor principal**: Usuario (todos los perfiles). **RF-08**. Pantalla M4 (CUR-04).
- **Precondiciones**: sesión abierta.
- **Flujo principal**:
  1. En todas las pantallas el sistema muestra arriba un indicador con el estado, la fecha y hora de la última actualización y, si corresponde, el motivo.
  2. Ante un cambio, el indicador se actualiza solo en todas las sesiones abiertas.
  3. Al tocar el indicador, el usuario ve el detalle y los avisos vigentes dirigidos a él; los urgentes se muestran también junto al indicador.
- **Extensiones**: ninguna.
- **Postcondiciones**: ninguna (consulta).

### CU-31 Publicar aviso institucional

- **Actor principal**: Bedel o Autoridad académica. **RF-14**, Riesgo 20. Pantalla D6 (CUR-13).
- **Precondiciones**: sesión con permiso de publicar avisos.
- **Flujo principal**:
  1. El usuario abre Avisos y elige "Nuevo aviso".
  2. Completa título (hasta 100 caracteres), cuerpo (hasta 2.000), prioridad (Normal o Urgente), destinatarios (todos, o por perfil, carrera, año o comisión), vigencia desde y hasta, y si se envía por correo.
  3. El sistema valida los campos obligatorios y que la vigencia sea coherente.
  4. El sistema publica el aviso en la sección Avisos de los destinatarios; si es urgente, también junto al indicador de estado.
  5. Si se eligió correo, extiende CU-32.
  6. El sistema confirma y muestra el aviso en el listado con el resultado de los envíos.
- **Extensiones**:
  - 3a. Datos incompletos o vigencia inválida: error junto al campo.
  - 1a. Llega desde CU-29: título y cuerpo vienen precargados con el motivo del estado.
  - \*a. Al vencer la vigencia, el aviso deja de mostrarse como activo y se conserva en el historial.
- **Postcondiciones**: aviso visible para los destinatarios en menos de 60 segundos.
- **Requisitos especiales**: los mantenimientos programados del sistema se anuncian con un aviso al menos 24 horas antes.

### CU-32 Notificar aviso por correo

- **Actor principal**: Sistema (extensión de CU-31). **RF-14, RF-17**.
- **Precondiciones**: aviso publicado con la opción de correo.
- **Flujo principal**:
  1. El sistema determina los destinatarios del segmento; a los estudiantes los incluye solo si activaron el correo de avisos.
  2. Encola un correo por destinatario, desde la dirección institucional, con contenido no promocional y un enlace para dejar de recibir notificaciones.
  3. El servicio de correo entrega cada mensaje; el sistema registra la notificación con su resultado.
- **Extensiones**:
  - 3a. Entrega fallida: reintenta y registra el fallo; el autor ve las entregas fallidas en el aviso.
- **Postcondiciones**: una notificación por destinatario con resultado.

### CU-33 Configurar comisiones seguidas y notificaciones

- **Actor principal**: Estudiante. **RF-17**. Pantalla M3 (CUR-03).
- **Precondiciones**: sesión de Estudiante.
- **Flujo principal**:
  1. El estudiante abre Preferencias.
  2. Busca comisiones por carrera, año y materia, y las agrega o quita de su lista.
  3. Activa o desactiva el correo de novedades y el correo de avisos.
  4. El sistema guarda las preferencias y confirma.
  5. Mis clases queda filtrado por las comisiones seguidas.
- **Extensiones**:
  - 2a. Comisión dada de baja: deja de aparecer en la búsqueda y se quita de la lista.
  - \*a. El estudiante usa el enlace "dejar de recibir notificaciones" de un correo: el sistema desactiva la opción correspondiente sin pedir inicio de sesión y confirma.
- **Postcondiciones**: preferencias guardadas y aplicadas.

### CU-34 Suspender clases por cierre

- **Actor principal**: Sistema (incluido desde CU-29). **RF-01**.
- **Precondiciones**: el estado institucional pasó a Cerrada.
- **Flujo principal**:
  1. El sistema obtiene las clases programadas cuyo horario cae dentro de la vigencia del cierre (desde la fecha y hora del cierre hasta la vigencia estimada o el fin del día si no se indicó) y que no estén en estado final.
  2. Las pasa a Suspendida en la misma transacción que el cambio de estado.
  3. Publica el cambio en tiempo real; los estudiantes lo ven en Mis clases junto al indicador de cierre.
- **Extensiones**:
  - 2a. La transacción falla: no cambia el estado institucional ni las clases (todo o nada).
- **Postcondiciones**: ninguna clase afectada queda Programada, Demorada, Virtual ni Docente presente.

## Módulo Histórico y consultas

### CU-35 Consultar históricos consolidados

- **Actor principal**: Autoridad académica. **RF-09**, CA-06. Pantalla D8 (CUR-15); colaboración en `08-diagramas-de-colaboracion.md`.
- **Precondiciones**: sesión de Autoridad académica.
- **Flujo principal**:
  1. La autoridad elige el tipo de consulta: asistencia docente, novedades, uso de aulas o incidencias.
  2. Indica el rango de fechas (obligatorio) y filtros opcionales: carrera, materia, comisión, docente, aula, tipo de evento.
  3. El sistema valida que la fecha desde sea menor o igual a la fecha hasta y que el rango no supere 12 meses.
  4. El sistema obtiene los registros, calcula los indicadores del tipo (tabla en `../producto/especificaciones/historico-y-consultas.md`) y muestra el detalle paginado con fecha, hora y usuario responsable de cada evento.
  5. Incluye CU-37: la consulta queda en auditoría.
- **Extensiones**:
  - 3a. Rango inválido o mayor a 12 meses: error junto al campo.
  - 4a. Sin datos: "Sin registros para el período".
- **Postcondiciones**: ninguna (consulta).
- **Requisitos especiales**: una consulta de hasta 12 meses responde en menos de 10 segundos; los registros por QR y manuales se distinguen; las clases finalizadas sin asistencia se cuentan como tales.

### CU-36 Consultar historial operativo

- **Actor principal**: Bedel. **RF-09**.
- **Precondiciones**: sesión de Bedel.
- **Flujo principal**:
  1. El bedel abre el historial de un aula, de las asistencias del día o de las incidencias.
  2. Elige el rango de fechas y filtros.
  3. El sistema muestra el detalle paginado con fecha, hora y usuario de cada evento.
- **Extensiones**:
  - 3a. Sin datos: "Sin registros para el período".
- **Postcondiciones**: ninguna (consulta).

### CU-37 Registrar evento en auditoría

- **Actor principal**: Sistema (incluido desde todo caso de uso que crea o cambia datos, y desde los accesos denegados). **RNF-03**, CA-06.
- **Precondiciones**: ocurrió un evento auditable: inicio de sesión, asistencia, novedad, cambio de aula, cambio de estado institucional, alta o cambio de usuario, generación de QR, asignación de aula, cambio de estado de incidencia, acceso denegado, consulta histórica.
- **Flujo principal**:
  1. El sistema registra fecha y hora, usuario, perfil, acción, entidad afectada y valores anteriores y nuevos, en la misma transacción que el evento.
- **Extensiones**:
  - 1a. El registro falla: la operación completa se revierte.
- **Postcondiciones**: registro inmutable; ningún perfil puede modificarlo ni eliminarlo; se conserva al menos dos ciclos lectivos.
