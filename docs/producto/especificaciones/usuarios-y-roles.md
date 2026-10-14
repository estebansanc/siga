# Usuarios y roles

Módulo transversal: habilita el acceso al resto del sistema y mantiene los datos académicos base sobre los que trabajan todos los módulos.

Requisitos cubiertos: RF-10, RF-11, RF-12, RF-13. Criterios de aceptación: CA-05, CA-09. Fuente: ERS v1.0 §3.2.10 a §3.2.13 y Apéndice C.

## Perfiles

Cuatro perfiles con permisos diferenciados: **Estudiante**, **Docente**, **Bedel** y **Autoridad académica**. La matriz de permisos completa está en `../requerimientos.md`. Reglas generales:

- El perfil Estudiante es el único que una persona puede asignarse por sí misma (autorregistro). Docente, Bedel y Autoridad los asigna un administrador.
- El autorregistro exige verificar el correo mediante un enlace. La institución puede configurar una lista opcional de dominios de correo permitidos; si está vacía, cualquier dominio puede registrarse.
- Tienen permiso de administración de usuarios y datos base los perfiles Bedel y Autoridad académica.
- Cada operación verifica en el servidor que el perfil tenga permiso. Si no lo tiene, responde "Acceso denegado" y lo registra en auditoría.

## RF-10 Gestión de usuarios y perfiles

**Quién**: Bedel o Autoridad académica (alta, edición, desactivación, asignación de perfil). Estudiante (autorregistro).

**Entrada**: apellido y nombre, DNI (7 u 8 dígitos), correo electrónico, legajo (opcional para estudiantes y docentes), perfil y, para docentes, comisiones asignadas.

**Flujo de alta por administrador**

1. El administrador crea o edita un usuario.
2. El sistema valida el formato del correo, que el DNI sea numérico de 7 u 8 dígitos, y que correo y DNI no estén ya registrados.
3. El sistema asigna el perfil y sus permisos.
4. El sistema envía al usuario un correo con un enlace para definir su contraseña, válido por 24 horas.

**Flujo de autorregistro de estudiante**

1. El estudiante se registra con su correo y sus datos. Si la institución configuró dominios permitidos, el correo debe pertenecer a uno de ellos.
2. El sistema envía un enlace de verificación; hasta verificar el correo no puede iniciar sesión.
3. Queda con perfil Estudiante; no puede elegir otro perfil.

**Desactivación**: es lógica. El usuario deja de poder iniciar sesión, pero todos sus registros históricos se conservan.

**Salidas**: usuario registrado o actualizado con su perfil; correo de activación enviado; error ante correo o DNI duplicados o con formato inválido; "Acceso denegado" ante operación no permitida.

## RF-11 Autenticación

**Entrada**: correo electrónico y contraseña.

**Flujo**

1. El usuario ingresa correo y contraseña.
2. El sistema verifica las credenciales y que el usuario esté activo.
3. Si son correctas, abre una sesión que vence tras 8 horas de inactividad y lleva al panel principal del perfil.
4. Si son incorrectas, muestra un error genérico ("Correo o contraseña incorrectos") sin indicar cuál dato falló. Tras 5 intentos fallidos consecutivos, la cuenta se bloquea 15 minutos.
5. Todo intento de acceder a una pantalla protegida sin sesión válida redirige al inicio de sesión.
6. El usuario puede cerrar sesión en cualquier momento y la sesión queda invalidada.

**Salidas**: acceso al panel del perfil; mensaje de credenciales incorrectas; mensaje de cuenta bloqueada temporalmente o desactivada.

## RF-12 Recuperación de contraseña

**Flujo**

1. El usuario elige "Olvidé mi contraseña" e ingresa su correo.
2. El sistema responde siempre con el mismo mensaje ("Si el correo está registrado, recibirás un enlace"), esté o no registrado el correo.
3. Si el correo está registrado y activo, envía un enlace de un solo uso válido por 60 minutos.
4. Al usar el enlace, el usuario define una contraseña nueva (mínimo 8 caracteres, con letras y números) y la confirma.
5. El sistema actualiza la contraseña, invalida el enlace y cierra las sesiones abiertas del usuario.

**Salidas**: confirmación de contraseña actualizada; error ante enlace vencido o reutilizado, o contraseña que no cumple la política.

## RF-13 Datos académicos base

**Quién**: Bedel (y Autoridad académica, por su permiso de administración).

**Entidades y datos**

| Entidad          | Datos                                                                                                             | Validaciones                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Carrera          | Código, nombre.                                                                                                   | Código único.                                                                                              |
| Materia          | Código, nombre, carrera, año de la carrera.                                                                       | Código único.                                                                                              |
| Comisión         | Código, materia, turno (Mañana / Tarde / Noche), año lectivo, período (cuatrimestre o anual), docentes asignados. | Código único; cada docente asignado debe tener perfil Docente.                                             |
| Horario          | Comisión, día de la semana, hora de inicio, hora de fin, aula habitual.                                           | Hora de fin posterior a la de inicio; el aula habitual no puede tener otra comisión en esa franja (RF-16). |
| Día no laborable | Fecha, motivo.                                                                                                    | Excluye la generación de clases ese día.                                                                   |
| Período lectivo  | Nombre (1er cuatrimestre, 2do cuatrimestre, anual), fecha de inicio, fecha de fin.                                | Fin posterior al inicio. Cada comisión pertenece a un período.                                             |

**Generación de clases programadas**

A partir de los horarios cargados, el sistema genera las clases programadas entre la fecha de inicio y la de fin del período lectivo de cada comisión (una por comisión, fecha y franja), excluyendo los días no laborables. Cada clase nace en estado "Programada" con el aula habitual asignada. Las clases programadas son la base de Mis clases (RF-07), de la asistencia (RF-03, RF-04), de las novedades (RF-05) y de la asignación de aulas (RF-16).

Criterio de aceptación CA-09: las clases programadas se generan a partir de los horarios cargados sin superposición de aulas.

**Salidas**: datos registrados y clases generadas; error ante códigos duplicados, horarios inválidos o superposición de aula. Cada operación queda en el historial.

## Institución

En el MVP hay una sola institución, UTN FRT, precargada al instalar el sistema. Los usuarios no crean ni cambian de institución. Los parámetros institucionales (turnos, períodos lectivos, días no laborables, dominios de correo permitidos, ubicación y radio para el QR, red institucional) se administran desde la configuración, por Bedel o Autoridad. El soporte multi-institución es un requisito futuro.

## Datos personales y privacidad

- Los estudiantes solo ven el nombre del docente. DNI, correo y registros de asistencia solo son visibles para Bedel y Autoridad académica.
- Cada usuario puede consultar y corregir sus datos de perfil y solicitar la baja de su cuenta.
- En el primer ingreso, el usuario acepta la política de privacidad, que informa qué datos se recolectan y con qué fin.
- Inicios de sesión, altas y cambios de usuarios quedan en el registro de auditoría.

## Pantallas

- Inicio de sesión. Registro de estudiante. Olvidé mi contraseña. Definir contraseña (activación y restablecimiento).
- Usuarios (Bedel, Autoridad): listado, alta, edición, desactivación, asignación de perfil y de comisiones a docentes.
- Datos académicos (Bedel): carreras, materias, comisiones, horarios, días no laborables, generación de clases del período.
- Mi perfil (todos): ver y corregir datos propios, solicitar baja.

## Fuera de alcance

- Importación masiva de datos académicos desde CSV o Excel y la integración con SIU-Guaraní o SYSACAD son requisitos futuros. En el MVP la carga es manual, una entidad a la vez.
