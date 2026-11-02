# Casos de uso reales: diseño de interfaz gráfica

Casos de uso "reales" (en el sentido de Larman): describen la interacción concreta del actor con la interfaz, pantalla por pantalla, con referencia a los mockups de `04-mockups.md`. Cada caso indica precondiciones, flujo principal sobre la pantalla, flujos alternativos y poscondiciones. Las pantallas se identifican como M1…M8 (móvil) y D1…D8 (escritorio).

## Componentes de interfaz comunes

| Elemento                          | Dónde                                                                                                                        | Comportamiento                                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indicador de estado institucional | Parte superior de todas las pantallas (M2–M8, D1–D8).                                                                        | Píldora con color, icono y texto: verde "Abierta", amarillo "Abierta con novedades", rojo "Cerrada"; hora de última actualización; motivo si corresponde. Al tocarla, abre el detalle con los avisos vigentes. Se actualiza sola cada 30 s. |
| Estado de clase                   | Tarjetas y tablas de clases.                                                                                                 | Color + icono + texto: gris "Sin registrar", verde "Docente presente", amarillo "Demorada N min", azul "Virtual", rojo "Ausente" / "Suspendida", gris "Finalizada".                                                                         |
| Navegación                        | Móvil: barra inferior con las secciones del perfil. Escritorio: barra lateral de 256 px con logo, menú del perfil y usuario. | Siempre visible; la opción activa queda resaltada.                                                                                                                                                                                          |
| Formularios                       | Todas las pantallas de carga.                                                                                                | Validación al salir de cada campo; error en español junto al campo; botón primario deshabilitado hasta que el formulario sea válido; confirmación con toast.                                                                                |
| Diálogos de confirmación          | Acciones irreversibles o de impacto (cerrar la institución, rechazar solicitud, desactivar usuario).                         | Diálogo con resumen de la acción, motivo cuando es obligatorio y botones "Cancelar" y acción.                                                                                                                                               |

## CUR-01 Iniciar sesión (pantalla M1)

- **Actor**: cualquier usuario. **Precondición**: cuenta activa con correo verificado.
- **Flujo principal**
  1. El usuario abre SiGA y ve M1: logo, campos "Correo electrónico" y "Contraseña", botón "Iniciar sesión", enlaces "Olvidé mi contraseña" y "Registrarme como estudiante".
  2. Completa correo y contraseña y toca "Iniciar sesión".
  3. El sistema valida y redirige al panel de su perfil: M2 (estudiante), M5 (docente), D1 (bedel) o D8 (autoridad).
- **Alternativos**
  - 3a. Credenciales incorrectas: mensaje "Correo o contraseña incorrectos" debajo del formulario, sin indicar cuál dato falló.
  - 3b. Quinto intento fallido: mensaje "Cuenta bloqueada temporalmente. Volvé a intentar en 15 minutos".
  - 3c. Cuenta desactivada: mensaje "Tu cuenta está desactivada. Contactá a bedelía".
  - 2a. "Olvidé mi contraseña": pantalla con un campo de correo; al enviar, muestra siempre "Si el correo está registrado, recibirás un enlace".
  - 2b. "Registrarme como estudiante": formulario de apellido, nombre, DNI, correo y contraseña; al enviar, pantalla "Revisá tu correo para verificar la cuenta".
- **Poscondición**: sesión abierta, vence tras 8 h de inactividad.

## CUR-02 Consultar mis clases de hoy (pantalla M2)

- **Actor**: estudiante. **Precondición**: sesión iniciada; idealmente comisiones seguidas configuradas (M3).
- **Flujo principal**
  1. Al iniciar sesión, el estudiante llega a M2: indicador institucional, fecha de hoy y una tarjeta por clase de sus comisiones seguidas con materia, comisión, horario, aula (código, edificio, piso), estado del docente y novedades activas con su mensaje.
  2. La lista se actualiza sola cada 30 s; no hace falta recargar.
  3. Toca una tarjeta para ver el detalle: docente, aula, historial de novedades del día.
- **Alternativos**
  - 1a. Sin comisiones seguidas: estado vacío "Todavía no seguís ninguna comisión" con botón "Elegir comisiones" que lleva a M3.
  - 1b. Institución cerrada: banner rojo destacado arriba de la lista con el motivo; las clases aparecen como "Suspendida".
  - 1c. Sin clases hoy: "No tenés clases hoy".
  - 3a. Pestaña "Buscar" (barra inferior): filtros combinables carrera, año, materia, comisión y fecha; mismo formato de tarjetas; "No se encontraron clases" si no hay resultados.
- **Poscondición**: ninguna; es una consulta. Cumple US-1: dos interacciones como máximo (iniciar sesión y mirar).

## CUR-03 Configurar comisiones seguidas y notificaciones (pantalla M3)

- **Actor**: estudiante.
- **Flujo principal**
  1. En M3 ve la lista de comisiones seguidas, cada una con botón "Quitar"; al tocarlo se guarda al momento (toast "Comisión quitada").
  2. En el buscador elige carrera, año y materia; el sistema lista las comisiones y toca "Agregar"; se guarda al momento (toast "Comisión agregada").
  3. Activa o desactiva "Recibir novedades por correo" y "Recibir avisos institucionales por correo"; cada interruptor se guarda al cambiarlo (toast "Vas a recibir …" o "Ya no vas a recibir …").
  4. Si el guardado falla, la pantalla vuelve a lo último guardado y se muestra el error.
- **Poscondición**: M2 se filtra por las comisiones seguidas; los correos se envían solo si están habilitados.

## CUR-04 Ver avisos institucionales (pantalla M4)

- **Actor**: cualquier perfil (se muestra la versión móvil del estudiante).
- **Flujo principal**
  1. En M4 ve los avisos vigentes ordenados por prioridad y fecha; los "Urgente" van destacados arriba con borde rojo.
  2. Toca un aviso para leer el cuerpo completo, la vigencia y el autor institucional.
- **Alternativos**: sin avisos vigentes, "No hay avisos por el momento".

## CUR-05 Publicar una novedad de clase (pantallas M5 y M6)

- **Actor**: docente. **Precondición**: clase programada propia no finalizada.
- **Flujo principal**
  1. En M5 (Mis clases) el docente ve sus clases de hoy con estado y el menú ⋯ de cada una. Entra a "Novedades" (menú) y toca "Publicar novedad", o elige "Publicar novedad" en el menú ⋯ de una clase para dejarla preseleccionada.
  2. En M6, paso 1: selecciona una o más de sus clases (chips); puede elegir un rango de fechas para una comisión.
  3. Paso 2: elige el tipo (Ausencia, Demora, Virtual, Suspensión, Cambio de aula). Según el tipo aparece el campo obligatorio: minutos de demora, enlace de la clase virtual o aula nueva (lista de aulas disponibles en esa franja).
  4. Paso 3: escribe un mensaje opcional (máximo 500 caracteres, contador visible).
  5. Toca "Publicar"; toast "Novedad publicada" y vuelve a M5 con la clase en su nuevo estado.
- **Alternativos**
  - 3a. Enlace inválido o aula no disponible: error junto al campo.
  - 2a. Clase ya finalizada: no aparece como seleccionable.
  - 5a. Desde el listado de novedades propias puede "Editar" o "Finalizar"; cada cambio queda en el historial.
- **Poscondición**: novedad visible para los estudiantes en < 60 s; correos encolados. Cumple US-2: menos de 1 minuto y 4 pasos como máximo.

## CUR-06 Registrar asistencia por QR (pantalla M7)

- **Actor**: docente. **Precondición**: bedelía mostró el QR del aula y turno (D3); el docente está en el aula.
- **Flujo principal**
  1. Desde el menú toca "Asistencia". M7 abre directamente la cámara con un marco de escaneo y el texto "Apuntá al código QR de bedelía".
  2. El navegador pide permiso de cámara (primera vez) y de ubicación; el docente acepta.
  3. Al leer el QR, el sistema valida y muestra la tarjeta verde "Asistencia registrada · Aula 12 · Turno Noche · 19:02".
- **Alternativos**
  - 3a. QR vencido o inválido: "El código venció. Pedile a bedelía que muestre el QR actualizado".
  - 3b. Sin clase en ese aula y turno: "No tenés una clase programada en esta aula en este turno".
  - 3c. Fuera de la institución y sin red institucional: "No pudimos confirmar que estés en la facultad. Pedile a bedelía el registro manual".
  - 3d. Permiso de cámara denegado: instrucciones para habilitarlo; permiso de ubicación denegado: se intenta por red institucional.
  - 3e. Ya registrada: muestra el registro existente, no duplica.
- **Poscondición**: clase en "Docente presente", visible en M2 de los estudiantes en < 60 s.

## CUR-07 Solicitar un aula (pantalla M8)

- **Actor**: docente.
- **Flujo principal**
  1. Desde el menú entra a "Aulas" y toca "Solicitar aula". En M8 completa fecha, franja horaria, cantidad de alumnos y recursos (chips: Proyector, Computadora, Climatización, etc.).
  2. El sistema lista las aulas disponibles que cumplen todo, ordenadas por capacidad más ajustada, con capacidad y equipamiento.
  3. Toca "Solicitar" en un aula; confirma en un diálogo; toast "Solicitud enviada. Queda pendiente de aprobación por bedelía".
- **Alternativos**
  - 2a. Ninguna cumple todo: mensaje con los criterios que no se cumplen y lista de aulas que cumplen parcialmente.
  - 3a. La clase no tiene aula y empieza en menos de 30 minutos: toast "Aula asignada. Bedelía fue informada".
- **Poscondición**: solicitud Pendiente (o Asignada) visible en D4.

## CUR-08 Cambiar el estado institucional (pantalla D1)

- **Actor**: bedel.
- **Flujo principal**
  1. En D1 ve el estado actual en grande con hora y motivo, el formulario de cambio y el historial.
  2. Elige el nuevo estado; si es "Cerrada" o "Abierta con novedades", el campo "Motivo" (máximo 280) se vuelve obligatorio; opcionalmente carga la vigencia estimada y marca "Generar aviso institucional asociado".
  3. Toca "Cambiar estado"; un diálogo confirma el impacto ("Las clases programadas durante el cierre pasarán a Suspendida"); confirma.
  4. El indicador superior cambia de inmediato; el historial agrega la fila con fecha, hora, estado, motivo y usuario.
- **Alternativos**
  - 2a. Mismo estado que el vigente: botón deshabilitado y mensaje "Ese ya es el estado actual".
  - 3a. Con "Generar aviso": se abre D6 precargada con el motivo y prioridad Urgente.
- **Poscondición**: estado visible para todos en < 60 s; clases afectadas suspendidas.

## CUR-09 Gestionar aulas (pantalla D2)

- **Actor**: bedel.
- **Flujo principal**
  1. En D2 ve la tabla de aulas con código, ubicación, capacidad, equipamiento, estado editable y ocupación en tiempo real ("Ocupada · 5K2 hasta 21:00" o "Libre").
  2. "Nueva aula" abre un diálogo con código, edificio, piso, capacidad (1–500), equipamiento (casillas), estado y observaciones; guarda y la fila aparece en la tabla.
  3. Al editar el estado a "Fuera de servicio" o "En mantenimiento" con clases asignadas, un diálogo lista las clases afectadas con acceso directo a reasignarlas (D4).
- **Alternativos**: código duplicado o capacidad fuera de rango, error junto al campo. La baja es lógica: el aula desaparece de las listas de asignación pero se conserva en el historial.

## CUR-10 Mostrar el QR de asistencia (pantalla D3)

- **Actor**: bedel. **Precondición**: institución abierta; el aula tiene clases programadas en el turno.
- **Flujo principal**
  1. En D3 elige aula y turno (fecha de hoy por defecto) y toca "Generar".
  2. El QR aparece en tamaño grande con "Aula 12 · Turno Noche · Se renueva en 42 s" y una barra de progreso; a la derecha, las clases programadas en ese aula y turno con su estado.
  3. El código se renueva solo cada 60 s mientras la pantalla está abierta; al registrarse una asistencia, la clase pasa a "Docente presente" en la lista lateral.
- **Alternativos**: institución cerrada, "No se puede generar el QR con la institución cerrada"; sin clases en el turno, "Esta aula no tiene clases programadas en este turno". El registro manual (RF-18) está disponible desde la misma pantalla con docente, clase, hora y motivo obligatorio.

## CUR-11 Aprobar o rechazar solicitudes (pantalla D4)

- **Actor**: bedel.
- **Flujo principal**
  1. En D4 ve la tabla de solicitudes con docente, comisión, fecha y franja, alumnos, recursos, aula y estado; las asignaciones inmediatas aparecen destacadas como "Asignada (inmediata)".
  2. Toca "Aprobar" en una Pendiente; el sistema verifica disponibilidad y la fila pasa a "Aprobada"; toast "Solicitud aprobada. Se notificó al docente".
  3. Toca "Rechazar": se abre el panel lateral con "Motivo (obligatorio)"; confirma y la fila pasa a "Rechazada".
- **Alternativos**: 2a. Otra operación ocupó el aula mientras tanto: error "El aula ya está asignada en esa franja" y la tabla se refresca. 2b. Si la clase ya estaba publicada con otra aula, se genera automáticamente la novedad "Cambio de aula".

## CUR-12 Gestionar incidencias (pantalla D5)

- **Actor**: bedel (los docentes reportan desde el móvil con el mismo formulario).
- **Flujo principal**
  1. En D5 ve la tabla de incidencias con aula, elemento, gravedad, estado, informante y fecha; el panel de detalle muestra descripción, foto e historial de estados.
  2. "Nueva incidencia" abre el formulario: aula, elemento, descripción (máximo 500), gravedad y foto opcional (JPG o PNG, hasta 5 MB).
  3. Si la gravedad es "Impide el uso del aula", el sistema ofrece pasar el aula a "Fuera de servicio".
  4. Desde el detalle toca "Marcar en curso" y luego "Marcar resuelta", con observación; al resolver, ofrece volver a habilitar el aula.
- **Poscondición**: historial de estados con fecha, hora y usuario; nunca se borra.

## CUR-13 Publicar un aviso institucional (pantalla D6)

- **Actor**: bedel o autoridad académica.
- **Flujo principal**
  1. En D6 completa título (máximo 100), cuerpo (máximo 2.000), prioridad, destinatarios (Todos, o por perfil, carrera, año o comisión), vigencia desde y hasta, y marca "Enviar por correo".
  2. Toca "Publicar"; el aviso aparece en la lista de publicados con el resultado de envíos ("128 enviados · 2 fallidos") que se actualiza a medida que se procesan.
- **Alternativos**: vigencia incoherente (hasta anterior a desde), error junto al campo. Los avisos urgentes se muestran además junto al indicador de estado institucional en todas las pantallas.

## CUR-14 Administrar usuarios y datos académicos (pantalla D7)

- **Actor**: bedel (usuarios y datos) o autoridad (usuarios).
- **Flujo principal**
  1. En D7, pestaña "Usuarios": tabla con nombre, DNI, correo, perfil y estado; "Nuevo usuario" abre el formulario (apellido, nombre, DNI de 7 u 8 dígitos, correo, legajo, perfil y, para docentes, comisiones asignadas). Al guardar, el sistema envía el enlace de activación válido 24 h.
  2. Pestañas "Carreras", "Materias", "Comisiones", "Horarios" y "Períodos": tablas con alta y edición en diálogo. En "Horarios", al cargar un aula habitual que se superpone con otra comisión, error "El aula ya está asignada en esa franja".
  3. En "Comisiones", el botón "Generar clases del período" crea las clases programadas excluyendo los días no laborables y muestra el resumen ("Se generaron 64 clases").
- **Alternativos**: correo o DNI duplicados, error junto al campo. "Desactivar" pide confirmación; el usuario deja de poder ingresar pero conserva su historial.

## CUR-15 Consultar históricos (pantalla D8)

- **Actor**: autoridad académica.
- **Flujo principal**
  1. En D8 elige el tipo (Asistencia docente, Novedades, Uso de aulas, Incidencias), el rango de fechas (máximo 12 meses) y filtros opcionales (carrera, materia, comisión, docente, aula).
  2. Toca "Consultar": aparecen las tarjetas de indicadores (por ejemplo "Asistencia docente 91 %", "Registros por QR 84 %", "Clases sin registro 23", "Registros manuales 12") y la tabla paginada con fecha, hora, docente, comisión, aula, método y usuario registrante.
- **Alternativos**: rango inválido o mayor a 12 meses, error junto al campo; sin datos, "Sin registros para el período".
- **Poscondición**: ninguna; consulta en menos de 10 segundos.
