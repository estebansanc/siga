# Diagramas de colaboración

Interacción entre objetos para los casos de uso principales. Mermaid no tiene diagrama de comunicación (colaboración) nativo, por lo que se usan diagramas de secuencia con los mensajes numerados jerárquicamente (1, 1.1, 1.2…), que es la información que un diagrama de colaboración agrega sobre uno de secuencia. Los participantes son los objetos de la arquitectura (`06-arquitectura-vistas.md`): pantalla, ruta de la API, servicio, repositorio (Prisma), cola de correo y servicios externos.

## CU-01 Iniciar sesión

```mermaid
sequenceDiagram
  actor U as Usuario
  participant P as Pantalla Login
  participant A as Better Auth
  participant DB as Postgres
  U->>P: 1. correo y contraseña
  P->>A: 1.1 signIn(correo, contraseña)
  A->>DB: 1.1.1 buscar cuenta, verificar hash, intentos fallidos
  alt credenciales válidas y usuario activo
    A->>DB: 1.1.2 crear sesión (8 h de inactividad)
    A-->>P: 1.2 cookie de sesión + perfil
    P-->>U: 1.3 redirige al panel del perfil
  else inválidas
    A->>DB: 1.1.3 incrementar intentos, bloquear 15 min si llega a 5
    A-->>P: 1.2 error genérico
    P-->>U: 1.3 "Correo o contraseña incorrectos"
  end
```

## CU-11 Consultar mis clases de hoy

```mermaid
sequenceDiagram
  actor E as Estudiante
  participant P as Pantalla Mis clases
  participant R as GET /clases
  participant S as Servicio clases
  participant Pr as Servicio preferencias
  participant DB as Postgres
  E->>P: 1. abre Mis clases
  P->>R: 1.1 GET /clases?fecha=hoy
  R->>S: 1.1.1 listar(usuario, filtros)
  S->>Pr: 1.1.1.1 comisiones seguidas(usuario)
  Pr->>DB: 1.1.1.1.1 preferencia_estudiante
  S->>DB: 1.1.1.2 clases programadas + aula + asistencia + novedades activas
  S->>S: 1.1.1.3 marcar Finalizada las clases cuya franja terminó
  S-->>R: 1.1.2 DTO con estado del docente por clase
  R-->>P: 1.2 JSON
  P-->>E: 1.3 tarjetas con color, icono y texto
  loop cada 30 s o al recuperar el foco
    P->>R: 2. GET /clases?fecha=hoy
    R-->>P: 2.1 JSON actualizado
  end
```

## CU-13 Publicar novedad de clase (con notificación)

```mermaid
sequenceDiagram
  actor D as Docente
  participant P as Pantalla Publicar novedad
  participant R as POST /novedades
  participant S as Servicio novedades
  participant SA as Servicio solicitudes-aula
  participant DB as Postgres
  participant Q as EmailOutbox
  participant M as Resend
  D->>P: 1. clases, tipo, datos, mensaje
  P->>R: 1.1 POST /novedades
  R->>R: 1.1.1 validar (zod) y permiso del perfil
  R->>S: 1.1.2 publicar(docente, datos)
  S->>DB: 1.1.2.1 verificar que las clases son del docente y no finalizaron
  opt tipo = Cambio de aula
    S->>SA: 1.1.2.2 reservar aula nueva en la franja
    SA->>DB: 1.1.2.2.1 verificar disponibilidad y asignar (transacción)
  end
  S->>DB: 1.1.2.3 crear novedad + novedad_clase, actualizar estado de clases, auditoría
  S->>DB: 1.1.2.4 estudiantes que siguen la comisión con correo habilitado
  S->>Q: 1.1.2.5 encolar un correo por estudiante
  S-->>R: 1.1.3 DTO novedad
  R-->>P: 1.2 201
  P-->>D: 1.3 "Novedad publicada"
  Q->>M: 2. enviar correos (diferido, tras responder)
  M-->>Q: 2.1 resultado por envío (SENT / FAILED)
```

## CU-24 Generar QR de asistencia

```mermaid
sequenceDiagram
  actor B as Bedel
  participant P as Pantalla QR de asistencia
  participant R as POST /qr-sesiones
  participant S as Servicio asistencia
  participant EI as Servicio estado-institucional
  participant DB as Postgres
  B->>P: 1. aula, fecha, turno
  P->>R: 1.1 POST /qr-sesiones
  R->>S: 1.1.1 generar(bedel, aula, fecha, turno)
  S->>EI: 1.1.1.1 estado vigente
  EI-->>S: 1.1.1.2 Abierta / Abierta con novedades (si Cerrada: error)
  S->>DB: 1.1.1.3 verificar clases programadas en aula y turno
  S->>DB: 1.1.1.4 crear sesión de QR, auditoría
  S->>S: 1.1.1.5 firmar token (aula, fecha, turno, expiración 60 s)
  S-->>R: 1.1.2 sesión + token
  R-->>P: 1.2 JSON
  P-->>B: 1.3 QR grande con cuenta regresiva
  loop cada 60 s mientras la pantalla está abierta
    P->>R: 2. GET /qr-sesiones/{id}/token
    R->>S: 2.1 nuevo token firmado
    S-->>P: 2.2 token
    P-->>B: 2.3 QR renovado
  end
```

## CU-26 Registrar asistencia por QR

```mermaid
sequenceDiagram
  actor D as Docente
  participant P as Pantalla Registrar asistencia
  participant Cam as Cámara / Geolocalización
  participant R as POST /asistencias
  participant S as Servicio asistencia
  participant DB as Postgres
  D->>P: 1. abre Registrar asistencia
  P->>Cam: 1.1 getUserMedia (cámara)
  Cam-->>P: 1.2 token leído del QR
  P->>Cam: 1.3 posición actual (con consentimiento)
  Cam-->>P: 1.4 lat, lng, precisión (o denegado)
  P->>R: 1.5 POST /asistencias {token, ubicación?}
  R->>S: 1.5.1 registrarPorQR(docente, token, ubicación, ip)
  S->>S: 1.5.1.1 verificar firma y vigencia del token
  S->>DB: 1.5.1.2 clase programada del docente en aula y turno
  S->>S: 1.5.1.3 validar presencia: radio 200 m o red institucional
  alt validaciones correctas
    S->>DB: 1.5.1.4 transacción: crear asistencia (método QR, resultado validación) + clase → Docente presente + auditoría
    S-->>R: 1.5.2 asistencia
    R-->>P: 1.6 201
    P-->>D: 1.7 "Asistencia registrada · Aula · Turno · hora"
  else token vencido / sin clase / fuera de la institución / ya registrada
    S-->>R: 1.5.2 error específico
    R-->>P: 1.6 4xx con código
    P-->>D: 1.7 mensaje específico, si es presencia, sugiere registro manual
  end
```

## CU-19 Aprobar solicitud de aula

```mermaid
sequenceDiagram
  actor B as Bedel
  participant P as Pantalla Solicitudes
  participant R as POST /solicitudes-aula/{id}/aprobar
  participant S as Servicio solicitudes-aula
  participant N as Servicio novedades
  participant DB as Postgres
  participant Q as EmailOutbox
  B->>P: 1. Aprobar
  P->>R: 1.1 POST aprobar
  R->>S: 1.1.1 aprobar(bedel, solicitudId)
  S->>DB: 1.1.1.1 BEGIN
  S->>DB: 1.1.1.2 bloquear solicitud y verificar disponibilidad del aula en la franja
  alt aula libre
    S->>DB: 1.1.1.3 asignar aula a la clase, solicitud → Aprobada
    opt la clase ya estaba publicada con otra aula
      S->>N: 1.1.1.4 crear novedad "Cambio de aula"
      N->>DB: 1.1.1.4.1 novedad + estudiantes suscriptos
      N->>Q: 1.1.1.4.2 encolar correos
    end
    S->>Q: 1.1.1.5 encolar correo al docente (aprobada)
    S->>DB: 1.1.1.6 COMMIT
    S-->>R: 1.1.2 solicitud aprobada
    R-->>P: 1.2 200
  else aula ocupada por otra operación concurrente
    S->>DB: 1.1.1.3 ROLLBACK
    S-->>R: 1.1.2 conflicto
    R-->>P: 1.2 409 "El aula ya está asignada en esa franja"
  end
  P-->>B: 1.3 resultado y ocupación actualizada
```

## CU-29 Registrar cierre de la institución

```mermaid
sequenceDiagram
  actor B as Bedel
  participant P as Pantalla Estado institucional
  participant R as POST /estado-institucional
  participant S as Servicio estado-institucional
  participant C as Servicio clases
  participant AV as Servicio avisos
  participant DB as Postgres
  participant Q as EmailOutbox
  B->>P: 1. estado Cerrada, motivo, vigencia, generar aviso
  P->>R: 1.1 POST
  R->>S: 1.1.1 cambiar(bedel, Cerrada, motivo, vigencia)
  S->>DB: 1.1.1.1 verificar que difiere del vigente y motivo presente
  S->>DB: 1.1.1.2 BEGIN, registrar nuevo estado con historial y auditoría
  S->>C: 1.1.1.3 suspender clases programadas afectadas
  C->>DB: 1.1.1.3.1 clases del período de vigencia → Suspendida
  opt generar aviso asociado
    S->>AV: 1.1.1.4 publicar aviso urgente a todos con el motivo
    AV->>DB: 1.1.1.4.1 crear aviso
    AV->>Q: 1.1.1.4.2 encolar correos según preferencias
  end
  S->>DB: 1.1.1.5 COMMIT
  S-->>R: 1.1.2 estado vigente
  R-->>P: 1.2 200
  P-->>B: 1.3 indicador en rojo "Cerrada"
  Note over P: Todas las sesiones abiertas actualizan el indicador en ≤ 60 s por consulta periódica
```

## CU-35 Consultar históricos consolidados

```mermaid
sequenceDiagram
  actor A as Autoridad
  participant P as Pantalla Consultas históricas
  participant R as GET /historico/{tipo}
  participant S as Servicio historico
  participant DB as Postgres
  A->>P: 1. tipo, rango, filtros
  P->>R: 1.1 GET /historico/asistencia?desde&hasta&filtros&pagina
  R->>R: 1.1.1 validar rango (desde ≤ hasta, ≤ 12 meses) y permiso del perfil
  R->>S: 1.1.2 consultar(tipo, rango, filtros, página)
  S->>DB: 1.1.2.1 indicadores agregados (porcentaje de asistencia, QR vs manual, clases sin registro)
  S->>DB: 1.1.2.2 detalle paginado con fecha, hora y usuario responsable
  S-->>R: 1.1.3 indicadores + página
  R-->>P: 1.2 JSON
  P-->>A: 1.3 tarjetas de indicadores y tabla
```
