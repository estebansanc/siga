# Modelo de base de datos

Modelo físico propuesto para SiGA sobre Postgres con Prisma, extendiendo el esquema base del repo (`../modelo-de-datos.md`: Better Auth, organizaciones, cola de correo, auditoría). Toda entidad del producto cuelga de `organization` con `organization_id` y las consultas filtran por la organización de la sesión. Nombres de tabla en `snake_case`; fechas en UTC.

## Diagrama entidad-relación

### Base (template) y usuarios

```mermaid
erDiagram
  user ||--o{ session : "tiene"
  user ||--o{ account : "tiene"
  user ||--o{ member : "pertenece"
  organization ||--o{ member : "tiene"
  organization ||--|| organization_settings : "configura"
  organization ||--o{ email_outbox : "envía"
  organization ||--o{ audit_log : "registra"
  user ||--o| user_profile : "perfil SiGA"
  organization ||--o{ user_profile : "tiene"

  user {
    string id PK
    string name
    string email UK
    boolean email_verified
  }
  member {
    string id PK
    string organization_id FK
    string user_id FK
    string role
  }
  user_profile {
    string user_id PK, FK
    string organization_id FK
    enum perfil "ESTUDIANTE | DOCENTE | BEDEL | AUTORIDAD"
    string apellido
    string nombre
    string dni
    string legajo
    boolean activo
    datetime ultimo_acceso
  }
  organization_settings {
    string organization_id PK, FK
    json turnos "rangos de Mañana, Tarde, Noche"
    decimal latitud
    decimal longitud
    int radio_metros "200 por defecto"
    string red_institucional
    string[] dominios_permitidos
  }
  email_outbox {
    string id PK
    string organization_id FK
    string to
    string subject
    enum status "PENDING | SENT | FAILED"
    int attempts
    string last_error
    datetime sent_at
  }
  audit_log {
    string id PK
    string organization_id FK
    string user_id FK
    string entity
    string entity_id
    string action
    json before
    json after
    datetime created_at
  }
```

### Datos académicos y clases

```mermaid
erDiagram
  carrera ||--o{ materia : "tiene"
  materia ||--o{ comision : "se dicta en"
  periodo_lectivo ||--o{ comision : "abarca"
  comision ||--o{ comision_docente : "tiene"
  user_profile ||--o{ comision_docente : "dicta"
  comision ||--o{ horario : "tiene"
  aula o|--o{ horario : "aula habitual"
  comision ||--o{ clase_programada : "genera"
  aula o|--o{ clase_programada : "asignada"
  dia_no_laborable }o--|| organization : "define"

  carrera {
    string id PK
    string organization_id FK
    string codigo UK
    string nombre
    boolean activa
  }
  materia {
    string id PK
    string carrera_id FK
    string codigo UK
    string nombre
    int anio_carrera
    boolean activa
  }
  periodo_lectivo {
    string id PK
    string organization_id FK
    string nombre
    date fecha_inicio
    date fecha_fin
  }
  comision {
    string id PK
    string materia_id FK
    string periodo_lectivo_id FK
    string codigo UK
    enum turno "MANANA | TARDE | NOCHE"
    int anio_lectivo
    boolean activa
  }
  comision_docente {
    string comision_id PK, FK
    string docente_id PK, FK
  }
  horario {
    string id PK
    string comision_id FK
    int dia_semana
    time hora_inicio
    time hora_fin
    string aula_habitual_id FK
  }
  dia_no_laborable {
    string id PK
    string organization_id FK
    date fecha UK
    string motivo
  }
  clase_programada {
    string id PK
    string comision_id FK
    date fecha
    time hora_inicio
    time hora_fin
    string aula_id FK
    enum modalidad "PRESENCIAL | VIRTUAL"
    enum estado "PROGRAMADA | DEMORADA | DOCENTE_PRESENTE | VIRTUAL | AUSENTE | SUSPENDIDA | FINALIZADA"
  }
```

### Aulas, solicitudes e incidencias

```mermaid
erDiagram
  aula ||--o{ solicitud_aula : "solicitada"
  clase_programada ||--o{ solicitud_aula : "para"
  user_profile ||--o{ solicitud_aula : "docente"
  aula ||--o{ incidencia : "tiene"
  user_profile ||--o{ incidencia : "informa"
  incidencia ||--o{ incidencia_estado : "historial"

  aula {
    string id PK
    string organization_id FK
    string codigo UK
    string edificio
    string piso
    int capacidad "1 a 500"
    string[] equipamiento
    enum estado "DISPONIBLE | FUERA_DE_SERVICIO | EN_MANTENIMIENTO"
    string observaciones
    boolean activa
  }
  solicitud_aula {
    string id PK
    string organization_id FK
    string docente_id FK
    string clase_id FK
    string aula_id FK
    date fecha
    time hora_inicio
    time hora_fin
    int cantidad_alumnos
    string[] recursos
    string comentario
    enum estado "PENDIENTE | ASIGNADA | APROBADA | RECHAZADA"
    boolean inmediata
    string motivo_rechazo
    string resuelta_por FK
    datetime resuelta_en
  }
  incidencia {
    string id PK
    string organization_id FK
    string aula_id FK
    string informante_id FK
    enum elemento "PROYECTOR | CLIMATIZACION | ILUMINACION | MOBILIARIO | CONECTIVIDAD | OTRO"
    string descripcion "máx 500"
    enum gravedad "LEVE | IMPIDE_USO"
    string foto_key
    enum estado "ABIERTA | EN_CURSO | RESUELTA"
  }
  incidencia_estado {
    string id PK
    string incidencia_id FK
    enum estado
    string observacion
    string user_id FK
    datetime created_at
  }
```

### Asistencia, novedades, estado institucional, avisos y preferencias

```mermaid
erDiagram
  aula ||--o{ sesion_qr : "para"
  user_profile ||--o{ sesion_qr : "genera (bedel)"
  clase_programada ||--o| asistencia_docente : "registra"
  user_profile ||--o{ asistencia_docente : "docente"
  sesion_qr o|--o{ asistencia_docente : "origen"
  novedad ||--|{ novedad_clase : "abarca"
  clase_programada ||--o{ novedad_clase : "afectada"
  user_profile ||--o{ novedad : "publica"
  aula o|--o{ novedad : "aula nueva"
  user_profile ||--o{ estado_institucional : "responsable"
  user_profile ||--o{ aviso : "autor"
  aviso ||--o{ notificacion : "genera"
  novedad ||--o{ notificacion : "genera"
  email_outbox o|--|| notificacion : "se envía por"
  user_profile ||--o| preferencia_estudiante : "configura"
  preferencia_estudiante ||--o{ comision_seguida : "sigue"
  comision ||--o{ comision_seguida : "seguida por"

  sesion_qr {
    string id PK
    string organization_id FK
    string aula_id FK
    date fecha
    enum turno
    string token_hash
    datetime expira_en
    datetime fin_turno
    string bedel_id FK
  }
  asistencia_docente {
    string id PK
    string organization_id FK
    string clase_id FK "única: una asistencia por clase"
    string docente_id FK
    datetime fecha_hora
    enum metodo "QR | MANUAL"
    enum validacion_ubicacion "UBICACION | RED | NO_APLICA"
    string sesion_qr_id FK
    string motivo "obligatorio si MANUAL"
    string registrado_por FK
  }
  novedad {
    string id PK
    string organization_id FK
    enum tipo "AUSENCIA | DEMORA | VIRTUAL | SUSPENSION | CAMBIO_AULA"
    int minutos_demora
    string enlace_virtual
    string aula_nueva_id FK
    string mensaje "máx 500"
    enum estado "ACTIVA | FINALIZADA"
    string publicada_por FK
    datetime created_at
  }
  novedad_clase {
    string novedad_id PK, FK
    string clase_id PK, FK
  }
  estado_institucional {
    string id PK
    string organization_id FK
    enum estado "ABIERTA | CERRADA | ABIERTA_CON_NOVEDADES"
    string motivo "máx 280"
    datetime desde
    datetime vigencia_hasta
    string user_id FK
  }
  aviso {
    string id PK
    string organization_id FK
    string titulo "máx 100"
    string cuerpo "máx 2000"
    enum prioridad "NORMAL | URGENTE"
    enum segmento_tipo "TODOS | PERFIL | CARRERA | ANIO | COMISION"
    string segmento_valor
    datetime vigencia_desde
    datetime vigencia_hasta
    boolean enviar_correo
    string autor_id FK
  }
  notificacion {
    string id PK
    string organization_id FK
    string destinatario_id FK
    string aviso_id FK
    string novedad_id FK
    string email_outbox_id FK
    datetime created_at
  }
  preferencia_estudiante {
    string user_id PK, FK
    boolean correo_novedades
    boolean correo_avisos
  }
  comision_seguida {
    string user_id PK, FK
    string comision_id PK, FK
  }
```

## Diccionario de tablas

| Tabla                                        | Descripción                                                   | Claves y restricciones                                                                                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_profile`                               | Datos de SiGA de cada usuario: perfil, DNI, legajo, activo.   | PK `user_id`; única `(organization_id, dni)`; `activo` para baja lógica.                                                                                                                                                                                                          |
| `organization_settings`                      | Parámetros de la institución.                                 | Turnos como JSON; ubicación, radio, red, dominios permitidos.                                                                                                                                                                                                                     |
| `carrera`, `materia`                         | Estructura académica.                                         | Códigos únicos por organización y por carrera.                                                                                                                                                                                                                                    |
| `periodo_lectivo`                            | Rango de fechas de cursado.                                   | `fecha_fin > fecha_inicio`.                                                                                                                                                                                                                                                       |
| `comision`                                   | Grupo de cursado.                                             | Código único por organización; pertenece a materia y período.                                                                                                                                                                                                                     |
| `comision_docente`                           | Docentes asignados a una comisión.                            | PK compuesta; `docente_id` debe tener perfil DOCENTE.                                                                                                                                                                                                                             |
| `horario`                                    | Franja semanal.                                               | `hora_fin > hora_inicio`; aula habitual sin superposición.                                                                                                                                                                                                                        |
| `dia_no_laborable`                           | Fechas excluidas de la generación.                            | Única `(organization_id, fecha)`.                                                                                                                                                                                                                                                 |
| `clase_programada`                           | Instancia de dictado.                                         | Única `(comision_id, fecha, hora_inicio)`; índice `(fecha, aula_id)`; restricción de exclusión por aula y franja (`EXCLUDE USING gist` sobre `aula_id` y `tsrange(fecha+hora_inicio, fecha+hora_fin)`), que es lo que impide dos clases en la misma aula en franjas superpuestas. |
| `aula`                                       | Espacio físico.                                               | Código único por organización; `capacidad BETWEEN 1 AND 500`; `activa` para baja lógica. "Ocupada" se calcula.                                                                                                                                                                    |
| `solicitud_aula`                             | Pedido de aula de un docente.                                 | `motivo_rechazo` obligatorio si RECHAZADA; `inmediata` marca la asignación a menos de 30 min.                                                                                                                                                                                     |
| `incidencia`, `incidencia_estado`            | Problema de infraestructura y su historial.                   | Historial solo inserta; nunca se borra.                                                                                                                                                                                                                                           |
| `sesion_qr`                                  | Código de asistencia por aula, fecha y turno.                 | `token_hash` del token vigente; `expira_en` ≤ 60 s; inválida tras `fin_turno`.                                                                                                                                                                                                    |
| `asistencia_docente`                         | Presencia registrada.                                         | Única `clase_id` (una asistencia por clase); `motivo` obligatorio si `metodo = MANUAL`; nunca se actualiza ni borra.                                                                                                                                                              |
| `novedad`, `novedad_clase`                   | Novedad y las clases que abarca.                              | Una novedad puede abarcar varias clases de la misma comisión; `aula_nueva_id` solo para CAMBIO_AULA.                                                                                                                                                                              |
| `estado_institucional`                       | Historial de estados.                                         | Solo inserta; el vigente es el de `desde` más reciente.                                                                                                                                                                                                                           |
| `aviso`                                      | Comunicado.                                                   | `vigencia_hasta ≥ vigencia_desde`; segmento por tipo y valor.                                                                                                                                                                                                                     |
| `notificacion`                               | Vínculo entre aviso o novedad, destinatario y correo en cola. | Exactamente uno de `aviso_id` o `novedad_id`; el resultado del envío vive en `email_outbox.status`.                                                                                                                                                                               |
| `preferencia_estudiante`, `comision_seguida` | Comisiones seguidas y opciones de correo.                     | PK por usuario; PK compuesta en la relación.                                                                                                                                                                                                                                      |
| `audit_log`                                  | Eventos de auditoría (ya existe).                             | Las tablas de SiGA se agregan a `auditedModels`; nunca se actualiza ni borra.                                                                                                                                                                                                     |

## Reglas implementadas en la base

- **Sin superposición de aulas**: restricción de exclusión en `clase_programada` por aula y rango horario (requiere la extensión `btree_gist`). Las asignaciones corren en una transacción y el conflicto se devuelve como 409.
- **Una asistencia por clase**: índice único en `asistencia_docente.clase_id`.
- **Inmutabilidad**: `asistencia_docente`, `novedad`, `estado_institucional`, `incidencia_estado` y `audit_log` no admiten `UPDATE` ni `DELETE` desde la aplicación; las correcciones son filas nuevas.
- **Bajas lógicas**: `activo`/`activa` en `user_profile`, `aula`, `carrera`, `materia`, `comision`.
- **Multi-tenant**: `organization_id` en todas las tablas del producto, con `ON DELETE CASCADE` e índices por organización.
- **Zona horaria**: columnas `timestamptz`; la aplicación presenta en UTC−3.

## Migraciones

Cada entidad se agrega con su migración en `packages/db/prisma/migrations` siguiendo el orden de desarrollo: usuarios y datos académicos → estado institucional y novedades → aulas, solicitudes e incidencias → QR y asistencia → avisos, notificaciones y preferencias → índices de históricos.
