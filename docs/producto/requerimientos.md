# Requerimientos

Catálogo de requisitos de SiGA. Los identificadores `RF-NN` y `RNF-NN` son los de la Matriz de Trazabilidad V1.2 y la ERS v1.0, y no cambian. El detalle de entrada, proceso, salida y reglas de cada funcional está en la especificación de su módulo (`especificaciones/`).

Prioridad: **Alta** = imprescindible para el MVP. **Media** = necesaria para el MVP, puede entregarse simplificada sin comprometer la aceptación. **Baja** = deseable, si el cronograma lo permite.

## Requisitos funcionales

| Id    | Requisito                                                                                                                        | Prioridad | Módulo                        | CA           | Dueño                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- | ------------ | --------------------------------- |
| RF-01 | Registro de apertura y cierre de la institución y de novedades institucionales                                                   | Alta      | Avisos y estado institucional | CA-01        | Bedeles, Autoridades              |
| RF-02 | Gestión de aulas y espacios: alta, edición, baja, capacidad, equipamiento, estado, disponibilidad                                | Alta      | Aulas y espacios              | CA-03        | Bedeles                           |
| RF-03 | Generación del código QR de asistencia docente por fecha, aula y turno, utilizable solo dentro de la institución                 | Alta      | Actividad docente             | CA-02        | Bedeles, Docentes                 |
| RF-04 | Registro de asistencia docente escaneando el QR desde el dispositivo del docente                                                 | Alta      | Actividad docente             | CA-02        | Docentes                          |
| RF-05 | Publicación, edición y cierre de novedades de clase: ausencia, demora, cambio de modalidad, suspensión, cambio de aula           | Alta      | Novedades                     | CA-03        | Docentes, Estudiantes             |
| RF-06 | Búsqueda y solicitud de aula por el docente según cantidad de alumnos y recursos                                                 | Media     | Aulas y espacios              | CA-04        | Docentes, Bedeles                 |
| RF-07 | Consulta en tiempo real del estado de clases por el estudiante, con filtros combinados por carrera, año, comisión y materia      | Alta      | Novedades                     | CA-03, CA-04 | Estudiantes                       |
| RF-08 | Visualización del estado institucional para todos los perfiles                                                                   | Alta      | Avisos y estado institucional | CA-01, CA-03 | Estudiantes                       |
| RF-09 | Consultas históricas consolidadas para autoridades: asistencia, novedades, uso de aulas, incidencias                             | Media     | Histórico y consultas         | CA-06        | Autoridades                       |
| RF-10 | Gestión de usuarios con cuatro perfiles y permisos diferenciados                                                                 | Alta      | Usuarios y roles              | CA-05        | Todos                             |
| RF-11 | Autenticación obligatoria para toda funcionalidad protegida                                                                      | Alta      | Usuarios y roles              | CA-05        | Todos                             |
| RF-12 | Recuperación de contraseña por enlace de un solo uso enviado al correo                                                           | Media     | Usuarios y roles              | CA-05        | Todos                             |
| RF-13 | Gestión de datos académicos base: carreras, materias, comisiones, horarios, docentes asignados; generación de clases programadas | Alta      | Usuarios y roles              | CA-09        | Secretaría Académica, Bedeles     |
| RF-14 | Publicación de avisos institucionales segmentados con notificación por correo                                                    | Alta      | Avisos y estado institucional | CA-03        | Autoridades, Bedeles, Estudiantes |
| RF-15 | Registro y seguimiento de incidencias de infraestructura o equipamiento de un aula                                               | Media     | Aulas y espacios              | CA-06        | Bedeles, Mantenimiento            |
| RF-16 | Asignación de aulas a clases y aprobación o rechazo de solicitudes, sin superposición de aula                                    | Alta      | Aulas y espacios              | CA-04        | Bedeles, Docentes, Autoridades    |
| RF-17 | Preferencias del estudiante: comisiones seguidas y notificaciones por correo                                                     | Media     | Avisos y estado institucional | CA-04        | Estudiantes                       |
| RF-18 | Registro manual de asistencia docente por el bedel, como contingencia, con motivo                                                | Media     | Actividad docente             | CA-06        | Bedeles, Docentes                 |

## Criterios de aceptación

| CA    | Criterio                                                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | El estado institucional queda registrado y visible para todos los perfiles en tiempo real.                                          |
| CA-02 | El QR no puede usarse fuera de la institución ni por perfiles no autorizados.                                                       |
| CA-03 | Los cambios (novedades, disponibilidad de aulas, estado institucional) son visibles en menos de 60 segundos.                        |
| CA-04 | Los filtros de búsqueda retornan resultados correctos y actualizados, y funcionan combinados.                                       |
| CA-05 | Cada perfil solo accede a las funcionalidades asignadas a su rol; un usuario no autenticado no accede a funcionalidades privadas.   |
| CA-06 | Los registros históricos persisten, son consultables con fecha, hora y usuario responsable, y no pueden alterarse retroactivamente. |
| CA-07 | El sistema funciona correctamente en Chrome, Firefox y Safari, en escritorio y móvil.                                               |
| CA-08 | No se exponen datos personales sin autorización y hay mecanismos de gestión de privacidad conforme a la Ley 25.326.                 |
| CA-09 | Las clases programadas se generan a partir de los horarios cargados sin superposición de aulas.                                     |

## Matriz de permisos por perfil

| Funcionalidad                                             | Estudiante |   Docente    |      Bedel      | Autoridad |
| --------------------------------------------------------- | :--------: | :----------: | :-------------: | :-------: |
| Ver estado institucional y avisos (RF-08)                 |     Sí     |      Sí      |       Sí        |    Sí     |
| Registrar estado institucional (RF-01)                    |     No     |      No      |       Sí        |    No     |
| Consultar estado de clases (RF-07)                        |     Sí     | Sí (propias) |       Sí        |    Sí     |
| Publicar novedades de clase (RF-05)                       |     No     | Sí (propias) |       Sí        |    No     |
| Gestionar aulas (RF-02)                                   |     No     |      No      |       Sí        |    No     |
| Solicitar aula (RF-06)                                    |     No     |      Sí      |       Sí        |    No     |
| Asignar aulas / aprobar solicitudes (RF-16)               |     No     |      No      |       Sí        |    No     |
| Asignar, mover y reemplazar clases desde el plano (RF-16) |     No     |      No      |       Sí        |    Sí     |
| Generar QR de asistencia (RF-03)                          |     No     |      No      |       Sí        |    No     |
| Registrar asistencia por QR (RF-04)                       |     No     |      Sí      |       No        |    No     |
| Registrar asistencia manual (RF-18)                       |     No     |      No      |       Sí        |    No     |
| Reportar incidencias (RF-15)                              |     No     |      Sí      |       Sí        |    No     |
| Gestionar incidencias (RF-15)                             |     No     |      No      |       Sí        |    No     |
| Publicar avisos institucionales (RF-14)                   |     No     |      No      |       Sí        |    Sí     |
| Consultas históricas (RF-09)                              |     No     |      No      | Sí (operativas) |    Sí     |
| Administrar usuarios y datos base (RF-10, RF-13)          |     No     |      No      |       Sí        |    Sí     |
| Configurar preferencias (RF-17)                           |     Sí     |      No      |       No        |    No     |

El control de permisos se verifica en el servidor en cada operación, nunca solo ocultando opciones en la interfaz. Todo acceso denegado queda en auditoría.

## Paneles principales por perfil

Al iniciar sesión, cada perfil llega a un panel propio:

- **Estudiante**: Mis clases de hoy, estado institucional, avisos.
- **Docente**: Mis clases, Registrar asistencia, Publicar novedad, Solicitar aula.
- **Bedel**: Estado institucional, Aulas, QR de asistencia, Solicitudes, Incidencias, Avisos, Usuarios.
- **Autoridad académica**: Clases (su inicio, con filtros y la fecha de hoy), Novedades e Incidencias (solo lectura), Consultas históricas, Avisos.

El indicador de estado institucional se muestra en la parte superior de todas las pantallas, para todos los perfiles.

## Requisitos no funcionales de producto

Se conservan los que son observables por el usuario o comprometen el comportamiento del producto. Los requisitos de implementación de la ERS (tecnologías, estándares de modelado, pipeline) no se trasladan: el stack lo define este repo.

### Tiempo real y rendimiento

| Id            | Requisito                                                                                                                                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-02 / EF-1 | Los cambios en novedades, aulas, asistencia docente y estado institucional son visibles para todos los usuarios con sesión activa en un máximo de 60 segundos. Objetivo de diseño: 5 segundos. Si no hay actualización automática, la aplicación consulta cada 30 segundos. |
| EF-2          | El 95 % de las consultas (listados de clases, aulas y avisos) responde en menos de 2 segundos y el 95 % de los registros (novedad, asistencia, asignación) en menos de 3 segundos, con conexión móvil 4G.                                                                   |
| EF-3          | Soporta al menos 300 usuarios con sesión simultánea sin degradar EF-2, considerando el pico al inicio de cada turno.                                                                                                                                                        |
| EF-4          | La validación completa de una asistencia por QR (lectura, verificación y confirmación) no supera los 5 segundos.                                                                                                                                                            |
| EF-5          | Las consultas históricas de hasta 12 meses se resuelven en menos de 10 segundos.                                                                                                                                                                                            |
| EF-6          | Las fotos de incidencias se comprimen a un máximo de 1 MB.                                                                                                                                                                                                                  |

### Usabilidad

| Id            | Requisito                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RNF-01 / US-0 | Aplicación web responsiva, sin instalación, utilizable en computadoras, smartphones y tablets. Pantallas desde 360 px de ancho sin desplazamiento horizontal.                        |
| US-1          | Un estudiante conoce el estado de sus clases del día en un máximo de 2 interacciones desde el inicio de sesión, sin capacitación previa.                                             |
| US-2          | Un docente publica una novedad en menos de 1 minuto y en no más de 4 pasos.                                                                                                          |
| US-3          | Un bedel opera todas las funciones de su perfil tras una capacitación de 2 horas como máximo; un docente, tras una demostración de 15 minutos o leer la guía rápida.                 |
| US-4          | Sin comandos que memorizar: todas las opciones visibles en el menú del perfil, con etiquetas en español.                                                                             |
| US-5          | Nivel AA de WCAG 2.1: contraste, elementos táctiles de 44×44 px como mínimo, navegación por teclado.                                                                                 |
| US-6          | Toda operación muestra un mensaje de confirmación o de error claro, en español, que indica cómo corregir el problema. Los errores de formulario se muestran junto al campo afectado. |
| US-7          | Manual de usuario por perfil y guía rápida accesibles desde el menú de ayuda.                                                                                                        |
| US-8          | Estados de clase y de aula con color, icono y texto a la vez (verde "Docente presente", amarillo "Demorada", rojo "Suspendida").                                                     |
| CA-07         | Navegadores soportados: Chrome, Firefox, Safari y Edge en sus dos últimas versiones estables, escritorio y móvil. Android 10+ e iOS 15+.                                             |

### Disponibilidad y fiabilidad

| Id     | Requisito                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FIAB-1 | Disponibilidad del 99 % durante el horario de funcionamiento de la institución (lunes a viernes de 7:00 a 23:30, sábados de 7:00 a 14:00), medida mensualmente, excluyendo mantenimientos programados. |
| FIAB-2 | Los mantenimientos programados se hacen fuera del horario de funcionamiento y se anuncian con al menos 24 horas de anticipación mediante un aviso institucional.                                       |
| FIAB-3 | Copias de seguridad diarias con retención mínima de 7 días. Pérdida máxima de datos ante un fallo: 24 horas.                                                                                           |
| FIAB-4 | Tiempo máximo de recuperación ante un fallo: 4 horas.                                                                                                                                                  |
| FIAB-6 | Las operaciones compuestas (asignar aula y generar la novedad de cambio; registrar asistencia y cambiar el estado de la clase) se completan todas o ninguna.                                           |

### Seguridad observable por el usuario

| Id             | Requisito                                                                                                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEG-1          | Inicio de sesión con correo electrónico y contraseña; toda funcionalidad protegida exige sesión válida.                                                                                                                                                              |
| SEG-3          | Contraseñas de al menos 8 caracteres con letras y números.                                                                                                                                                                                                           |
| SEG-4          | Un perfil no puede acceder a datos ni operaciones de otro perfil aunque manipule la interfaz o las solicitudes.                                                                                                                                                      |
| SEG-5          | Los códigos QR tienen una vigencia máxima de 60 segundos por código mostrado y no pueden reutilizarse.                                                                                                                                                               |
| SEG-6 / RNF-03 | Todos los eventos relevantes (inicios de sesión, asistencias, novedades, cambios de aula, estado institucional, altas y cambios de usuarios) quedan en un registro de auditoría con fecha, hora y usuario responsable que ningún perfil puede modificar ni eliminar. |
| SEG-7          | Los archivos subidos se limitan a imágenes JPG o PNG de hasta 5 MB.                                                                                                                                                                                                  |
| SEG-9          | Límite de intentos en inicio de sesión, recuperación de contraseña y registro de asistencia. Tras 5 intentos fallidos de inicio de sesión consecutivos, la cuenta se bloquea 15 minutos.                                                                             |
| SEG-10         | La sesión vence tras 8 horas de inactividad. Cerrar sesión invalida la sesión de inmediato.                                                                                                                                                                          |

### Privacidad y ética

| Id             | Requisito                                                                                                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-04 / PRI-1 | Cumplimiento de la Ley 25.326 de Protección de los Datos Personales.                                                                                                                                                                                                  |
| PRI-2          | Minimización: solo se recolectan los datos necesarios y se informa su finalidad en una política de privacidad que el usuario acepta en su primer ingreso. El equipo redacta el borrador de la política y el Departamento de Sistemas lo valida antes del lanzamiento. |
| PRI-3          | Los estudiantes solo ven el nombre del docente y el estado de sus clases. DNI, correo y registros de asistencia solo son visibles para bedeles y autoridades.                                                                                                         |
| PRI-4          | Cada usuario puede consultar y corregir sus datos de perfil y solicitar la baja de su cuenta.                                                                                                                                                                         |
| ETI-1          | La asistencia docente se usa solo para comunicar el estado de las clases y generar estadísticas. No hay sanciones ni descuentos automáticos.                                                                                                                          |
| ETI-2          | No se publican los motivos personales de una ausencia: los estudiantes ven el tipo de novedad y el mensaje que el docente decide compartir.                                                                                                                           |
| ETI-3          | No hay seguimiento continuo de ubicación. La geolocalización se consulta solo al escanear el QR, con consentimiento explícito, y no se almacenan las coordenadas.                                                                                                     |
| ETI-4          | La información publicada es la fuente oficial y equitativa para todos los estudiantes.                                                                                                                                                                                |

### Idioma, fechas y datos

| Id    | Requisito                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RES-6 | Toda la interfaz, los mensajes y la ayuda están en español.                                                                                                                                                  |
| RES-7 | Avisos y recuperación de contraseña se comunican por correo electrónico. No se usan SMS ni mensajería con costo por mensaje.                                                                                 |
| DAT-1 | Las fechas y horas se muestran en la zona horaria de Argentina (UTC−3) con formato `dd/mm/aaaa hh:mm`.                                                                                                       |
| DAT-2 | Las bajas son lógicas en todas las entidades con historial (usuarios, aulas, comisiones); no se eliminan registros físicamente.                                                                              |
| DAT-3 | Asistencias, novedades, estado institucional y auditoría no se modifican ni eliminan retroactivamente; las correcciones se registran como eventos nuevos.                                                    |
| DAT-4 | Los datos históricos se conservan como mínimo durante dos ciclos lectivos.                                                                                                                                   |
| DAT-5 | El modelo conserva identificadores externos (legajo, código de materia y de comisión) para facilitar una integración futura con SIU-Guaraní y SYSACAD.                                                       |
| CFG-1 | Los parámetros institucionales (ubicación y radio de validación del QR, red institucional, turnos, períodos lectivos, días no laborables, dominios de correo permitidos) se configuran sin modificar código. |
| CFG-2 | En el MVP hay una sola institución, UTN FRT, precargada. Los usuarios no crean instituciones.                                                                                                                |

## Entidades de datos

| Entidad                   | Descripción                                    | Datos principales                                                                                                                                                         |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario                   | Persona que accede al sistema.                 | Apellido, nombre, DNI, correo (único), legajo, perfil, estado (activo/inactivo), fecha de alta, último acceso.                                                            |
| Perfil / Permiso          | Rol del usuario y operaciones habilitadas.     | Estudiante, Docente, Bedel, Autoridad; permisos según la matriz.                                                                                                          |
| Carrera                   | Carrera de la institución.                     | Código, nombre.                                                                                                                                                           |
| Materia                   | Asignatura de una carrera.                     | Código, nombre, carrera, año de la carrera.                                                                                                                               |
| Comisión                  | Grupo de cursado de una materia.               | Código, materia, turno, año lectivo, período (cuatrimestral o anual), docentes asignados.                                                                                 |
| Horario                   | Franja semanal de cursado de una comisión.     | Comisión, día de la semana, hora de inicio, hora de fin, aula habitual.                                                                                                   |
| Clase programada          | Instancia de dictado en una fecha.             | Comisión, fecha, hora de inicio y fin, aula asignada, modalidad, estado.                                                                                                  |
| Aula                      | Espacio físico de dictado.                     | Código (único), ubicación (edificio, piso), capacidad, equipamiento, estado (Disponible, Fuera de servicio, En mantenimiento; Ocupada se calcula), observaciones, activa. |
| Período lectivo           | Rango de fechas de cursado.                    | Nombre, fecha de inicio, fecha de fin.                                                                                                                                    |
| Solicitud de aula         | Pedido de aula de un docente.                  | Docente, clase, fecha y franja, cantidad de alumnos, recursos, aula solicitada, estado, motivo de rechazo.                                                                |
| Estado institucional      | Situación de apertura de la institución.       | Estado, motivo, fecha y hora, vigencia, usuario responsable.                                                                                                              |
| Sesión de QR              | Código de asistencia generado.                 | Aula, fecha, turno, token, expiración, bedel generador.                                                                                                                   |
| Asistencia docente        | Registro de presencia de un docente.           | Docente, clase, fecha y hora, método (QR / manual), resultado de la validación de ubicación, motivo (si es manual), usuario registrante.                                  |
| Novedad                   | Información sobre una clase.                   | Clase(s), tipo, minutos de demora, enlace virtual, aula nueva, mensaje, estado (activa/finalizada), docente, fecha y hora.                                                |
| Aviso institucional       | Comunicado oficial.                            | Título, cuerpo, prioridad, segmento de destinatarios, vigencia, autor, fecha de publicación.                                                                              |
| Notificación              | Envío de correo asociado a un aviso o novedad. | Destinatario, referencia, fecha de envío, resultado.                                                                                                                      |
| Incidencia                | Problema de infraestructura de un aula.        | Aula, elemento, descripción, gravedad, foto, estado, historial de estados, usuario informante.                                                                            |
| Preferencia de estudiante | Configuración de seguimiento.                  | Estudiante, comisiones seguidas, opciones de notificación.                                                                                                                |
| Registro de auditoría     | Evento trazable.                               | Fecha y hora, usuario, perfil, acción, entidad afectada, valores anteriores y nuevos.                                                                                     |

## Estados de una clase programada

| Estado           | Significado                                                                                             | Evento que lo produce                                                  | Estados siguientes                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| Programada       | Clase prevista, sin registro del docente.                                                               | Generación de clases (RF-13).                                          | Docente presente, Demorada, Ausente, Virtual, Suspendida |
| Demorada         | El docente informó que llegará tarde.                                                                   | Novedad "Demora" (RF-05).                                              | Docente presente, Ausente, Suspendida                    |
| Docente presente | Asistencia del docente registrada.                                                                      | Asistencia por QR (RF-04) o manual (RF-18).                            | Finalizada                                               |
| Virtual          | La clase se dicta en modalidad virtual.                                                                 | Novedad "Cambio de modalidad" (RF-05).                                 | Finalizada                                               |
| Ausente          | El docente no asistirá; la clase no se dicta.                                                           | Novedad "Ausencia" (RF-05).                                            | Final                                                    |
| Suspendida       | Clase suspendida por el docente o por cierre institucional.                                             | Novedad "Suspensión" (RF-05) o estado institucional "Cerrada" (RF-01). | Final                                                    |
| Finalizada       | La franja horaria terminó. Una clase que seguía Programada queda Finalizada sin registro de asistencia. | Fin del horario de la clase.                                           | Final                                                    |

El cambio de aula (RF-05, RF-16) no modifica el estado de la clase: actualiza el aula asignada y genera una novedad visible para los estudiantes.

## Glosario

| Término                 | Definición                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Bedel / Bedelía         | Personal administrativo responsable de la gestión operativa diaria de aulas, apertura de la institución y control de la actividad docente. |
| Autoridad académica     | Directora de carrera, Secretaría Académica, Decanato u otro perfil jerárquico que consulta información consolidada.                        |
| Comisión                | Grupo de estudiantes que cursa una materia en un horario y con un docente determinado (por ejemplo, 5K2).                                  |
| Turno                   | Franja horaria de cursado: mañana, tarde o noche.                                                                                          |
| Clase programada        | Instancia de dictado de una comisión en una fecha, horario y aula determinados.                                                            |
| Estado institucional    | Situación general de la institución: abierta, cerrada o abierta con novedades (paro, corte de servicio, actividad parcial).                |
| Novedad                 | Información publicada sobre una clase: ausencia, demora, cambio de modalidad, suspensión o cambio de aula.                                 |
| Aviso institucional     | Comunicado oficial dirigido a toda la comunidad o a un segmento (carrera, año, comisión o perfil).                                         |
| Incidencia              | Problema de infraestructura o equipamiento de un aula.                                                                                     |
| Código QR de asistencia | Código generado por bedelía, vinculado a fecha, aula y turno, que el docente escanea para registrar su presencia.                          |
| Tiempo real             | Que un cambio registrado sea visible para los usuarios en 60 segundos como máximo.                                                         |
