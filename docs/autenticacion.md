# Autenticación

Better Auth en `packages/auth/src/server.ts`, montado en `apps/web/app/api/auth/[...all]/route.ts`.

## Métodos

- **Email y contraseña** (`emailAndPassword`, 8 caracteres o más con letras y números; el correo se verifica por enlace, ver abajo).
- **Google** (`socialProviders.google`, `prompt: "select_account"`). Sin `GOOGLE_CLIENT_ID` el botón de Google no funciona; el resto de la app sí.

## Institución y perfil

SiGA tiene una sola institución (CFG-2): la organización `utn-frt` que carga el seed (`institutionSlug` en `packages/domain/src/institucion.ts`). Nadie crea organizaciones (`allowUserToCreateOrganization: false`). En `databaseHooks.session.create.before` (la primera sesión de la cuenta, no al crear el usuario) una cuenta sin membresía entra a la institución como `member` con perfil `ESTUDIANTE` en `UserProfile`, el único perfil que una persona puede asignarse sola; Docente, Bedel y Autoridad los asigna un administrador. Ese mismo hook fija `activeOrganizationId` prefiriendo la membresía `owner` y, si no hay, la primera. Sin institución cargada el hook falla con "Corré pnpm db:seed": el seed es obligatorio en local, en e2e y en staging. El bedel del seed (`demo@example.com`) es el `owner` de la institución y por eso ve Configuración.

## Contexto de sesión

`getAuthContext(headers)` (`packages/auth/src/session.ts`) devuelve `{ userId, organizationId, role, perfil, userName, userEmail, lostOrganization }`. La membresía y el perfil se leen en **cada request**: la sesión no se cachea en cookie y no se invalida al quitar a un miembro ni al desactivar una cuenta, así que, **si la cuenta es miembro de la institución (`institutionSlug`), la sesión usa siempre esa membresía** (al iniciar sesión y en cada request, sin importar qué otras tenga, cuál sea la más antigua ni dónde sea Administrador; `pickMembership` en `packages/domain/src/institucion.ts`) y una organización activa distinta se reemplaza sin aviso. Sin esa membresía (baja de un Administrador) no se la da de alta de nuevo: si la organización activa ya no tiene una membresía se vuelve a la organización propia (o a la primera membresía), y una cuenta sin `UserProfile` o con `activo = false` no obtiene contexto (401 en la API, login en la web). Sin ninguna membresía la API responde 401. `lostOrganization` (`{ id, name } | null`) nombra esa organización cuando pasó eso: `removeMembership` deja `activeOrganizationId` de la cookie apuntando a ella a propósito (no la limpia) para que este cálculo pueda leer su nombre antes de caer a la propia; se sigue informando en cada request mientras la cuenta no vuelva a elegir activamente una organización (`auth.api.setActiveOrganization` sí la corrige). `GET /me` expone el mismo dato y el shell (`apps/web/components/layout/lost-organization-notice.tsx`) lo usa para el aviso "Ya no formás parte de..." y para volver al inicio en la primera navegación posterior, sea cual sea la pantalla (ver `docs/ui.md`). `role` es `owner` (Administrador) o `member`; `perfil` es `ESTUDIANTE`, `DOCENTE`, `BEDEL` o `AUTORIDAD`.

`userName` y `userEmail` vienen de la sesión; `GET /me` los lee de la base para que un cambio hecho en Mi perfil (`PATCH /me`) se vea sin depender de la sesión.

Quien pierde el acceso (`lostOrganization`) ve en `LostOrganizationNotice` "Ya no tenés acceso a <institución>." y "Si creés que es un error, consultá en Bedelía."; el acceso no vuelve solo. Los textos hablan de institución y usuarios, no de organización, miembro ni invitación.

## Autorización

El middleware `ownerOnly` (`packages/api/src/middleware.ts`) protege las escrituras de Configuración (ajustes y quitar miembros por la API) con 403 `FORBIDDEN` en español; las lecturas (`GET /settings`, `GET /members`) siguen abiertas a cualquier miembro. Las rutas de SiGA llevan `perfilOnly(...perfiles)` según la matriz de permisos de `docs/producto/requerimientos.md`, y el servicio vuelve a verificarlo con `assertPerfil` (`packages/api/src/services/permisos.ts`), que registra todo acceso denegado en `audit_log` (`entity: "Permiso"`, `action: "acceso_denegado"`) antes de responder 403 "Acceso denegado" (SEG-6). `GET /me` expone quién es la sesión activa (usuario, rol, perfil) y las organizaciones de la cuenta.

## Cuentas, verificación y activación (RF-10)

- **Autorregistro** (`/registro`): solo Estudiante. `requireEmailVerification: true`: el registro no abre sesión, manda un enlace de 24 horas (`emailVerification.expiresIn`) y la pantalla muestra "Revisá tu correo". Abrir el enlace verifica la cuenta y entra (`autoSignInAfterVerification`); sin verificar, el login responde `EMAIL_NOT_VERIFIED` y ofrece "Reenviar enlace" (`sendOnSignIn` está apagado: reenviar es manual). Google ya trae el correo verificado.
- **Dominios permitidos** (`OrganizationSettings.dominiosPermitidos`, se cargan en Usuarios): el hook `databaseHooks.user.create.before` rechaza el registro y el alta con Google de un correo fuera de la lista, nombrando los dominios aceptados; con la lista vacía vale cualquiera. Las altas de Bedel y Autoridad no pasan por ese hook.
- **Alta por Bedel o Autoridad** (`POST /usuarios`): la API crea `User` (sin verificar), `Member` (`member`) y `UserProfile`, y pide `auth.api.requestPasswordReset`; el enlace (`/activar-cuenta?token=…&email=…`, 24 h, un solo uso) lo manda `sendResetPassword`. Definir la contraseña crea la cuenta de credenciales, `onPasswordReset` verifica el correo y la pantalla ingresa directo. Reenviar borra los tokens `reset-password:*` de la cuenta antes de pedir otro, así que el anterior deja de servir. La cuenta queda "Pendiente de activación" hasta entonces.
- **Contraseña**: 8 caracteres o más, con letras y números (`contrasenaSchema` de `packages/domain`), validada en `hooks.before` para `/sign-up/email` y `/reset-password`.
- **Desactivados**: `UserProfile.activo = false`. El hook de sesión rechaza el login con `ACCOUNT_DEACTIVATED` ("Tu cuenta está desactivada"), y `getAuthContext` devuelve `null` en cada request aunque la sesión siga vigente; `requireSession` distingue ese caso con `isAccountDeactivated` y redirige a `/cuenta-desactivada` (el mensaje con "Cerrar sesión"). Reactivar vuelve a dar acceso sin reiniciar nada. Las novedades, asistencias y comisiones del desactivado se conservan.
- **Correos de la cuenta** (verificación y activación): `packages/auth` no importa la cola de la API; `packages/api/src/auth-emails.ts` registra con `configureAuthEmails` quién los encola en `EmailOutbox` (plantillas `activationEmail` y `verificationEmail`). Quien monta Better Auth importa ese módulo (`apps/web/app/api/auth/[...all]/route.ts`) y el servicio de usuarios también.
- **Recuperar contraseña** (RF-12): `/login` ofrece "¿Olvidaste tu contraseña?" → `/recuperar-contrasena` (`POST /cuenta/recuperar-contrasena`, ver `docs/api.md`). La respuesta es siempre "Si el correo está registrado, recibirás un enlace"; el servicio `recuperar-contrasena` llama a `auth.api.requestPasswordReset` solo si la cuenta existe y no está desactivada (una cuenta solo con Google también lo recibe) y acorta el token a 60 minutos (Better Auth usa 24 horas para activación y recuperación por igual). Un pedido nuevo no invalida los anteriores. `sendResetPassword` manda a una cuenta verificada el correo `passwordResetEmail` con `/definir-contrasena?token=…`, y a una sin verificar el de activación. `/definir-contrasena` (nueva contraseña y confirmación; política "Mínimo 8 caracteres, con al menos una letra y un número.", primera regla incumplida de largo, letra y número, en `primerErrorContrasena` de `packages/domain`) consulta `GET /cuenta/definir-contrasena/{token}` al abrir y confirma con `POST`; con `revokeSessionsOnPasswordReset` las demás sesiones se cierran, y dejan de servir en su próxima request. Vuelve a `/login?contrasena=actualizada` ("Tu contraseña se actualizó"). Ambas pantallas son públicas (`openRoutes` de `proxy.ts`). Límites con `RateLimitBucket`: 5 por IP cada 15 minutos y 3 por correo por hora, ventanas fijas.
- Las invitaciones del template (`/invitacion/[id]` y `/invitations`) se retiraron: Usuarios las reemplaza. La tabla `Invitation` del plugin `organization` sigue en el schema sin uso.

## Bloqueo, inactividad y cierre global (RF-11, SEG-9, SEG-10, SEG-6)

- **Bloqueo**: los hooks de `packages/auth/src/server.ts` (lógica en `login-security.ts`, política en `bloqueo-cuenta.ts` de `packages/domain`) cuentan los fallos de `POST /sign-in/email` en `BloqueoCuenta`. Al quinto consecutivo (sin ventana de tiempo) la cuenta se bloquea 15 minutos y esa misma respuesta, igual que todo intento posterior, aun con la contraseña correcta, es 401 `ACCOUNT_LOCKED` con "Cuenta bloqueada temporalmente. Podés volver a intentar a las HH:mm." (hora argentina, 24 h; el plazo no se extiende). Un ingreso exitoso o el fin del bloqueo ponen el contador en cero. Un correo inexistente recibe siempre el error genérico. El bloqueo no alcanza a Google. El login muestra el mensaje en un toast.
- **Inactividad**: no hay caché de cookie; la sesión dura 8 horas (`session.expiresIn`) y cada request la renueva (`updateAge` de 60 segundos). Vencida, la web redirige a `/login?next=<ruta>` y la API responde 401.
- **Cierre global**: el hook previo de `/sign-out` borra todas las sesiones de la cuenta (web y bearer); los demás dispositivos pierden acceso en su próxima request.
- **Auditoría**: cada ingreso exitoso (correo o Google, en `databaseHooks.session.create.after`), cada fallo y cada bloqueo quedan en `AuditLog` (`entity: "Ingreso"`, ver `docs/modelo-de-datos.md`). Cerrar sesión no se audita.

## Política de privacidad (PRI-1, PRI-2)

- Toda cuenta, de cualquier perfil y sea por autorregistro o por alta de un administrador, debe aceptar la versión vigente de la política (la de número más alto en `PoliticaPrivacidad`) antes de usar la app. `GET /me` informa `politicaPendiente`.
- El layout autenticado (`apps/web/app/(app)/layout.tsx`) lo lee: con la aceptación pendiente redirige toda pantalla interna a `/politica-de-privacidad?next=<ruta pedida>` y esa pantalla se muestra sin menú, con "Aceptar y continuar" (registra fecha, hora y versión y vuelve a `next` o al inicio) y "Cerrar sesión" (no registra nada).
- Ya aceptada, se relee desde el ítem "Política de privacidad" del menú de usuario, con menú y la leyenda "Aceptaste esta versión el dd/mm/aaaa".
- Una versión nueva vuelve a pedir la aceptación a todos; las aceptaciones anteriores se conservan. `POST /politica-de-privacidad/aceptaciones` responde 409 si la versión enviada no es la vigente: la pantalla avisa, muestra la nueva y no registra nada.
- Texto y versión son datos (`docs/modelo-de-datos.md`): publicar una versión no cambia la pantalla ni el flujo. La API no bloquea el resto de las rutas: el bloqueo es de las pantallas.
- Después de iniciar sesión (`LoginForm`, `ActivarCuentaForm`) se navega con una carga completa (`navigateAfterSignIn`): una navegación blanda cuyo destino el layout redirige a la política dejaba la pantalla en blanco.

## Sesión en la web

- `proxy.ts` redirige a `/login?next=<ruta>` si no hay cookie de sesión (chequeo rápido con `getSessionCookie`), pero solo para las rutas internas conocidas (`protectedRoutes`: `/`, `/configuracion`, `/mi-perfil` y las pantallas de SiGA, `/clases`, `/novedades`, `/estado-institucional`, `/preferencias` y las secciones "Próximamente"): el proxy no sabe qué rutas existen de verdad, así que cualquier otra URL (incluida una que no exista) sigue de largo y la resuelve Next, que responde 404 con la pantalla neutra de `apps/web/app/not-found.tsx` en vez de pedir login primero. Esa lista es manual: toda ruta nueva de la app va también ahí, y si una se saca de la app hay que sacarla de la lista. `/login` y `/registro` redirigen a `/` cuando ya hay sesión y, sin sesión, vuelven a `next` después de entrar (solo rutas internas; el link entre ambas lo conserva). `/~offline` no redirige en ningún sentido.
- Los Server Components validan la sesión real con `requireSession()` (`apps/web/lib/session.ts`). Sin sesión válida (vencida o cerrada desde otro dispositivo, con la cookie todavía en el navegador) redirige a `GET /api/sesion-vencida?next=<ruta>`, que borra las cookies de sesión y lleva a `/login?next=<ruta>`; sin borrarlas, el proxy devolvería `/login` al inicio en bucle. El proxy pasa la ruta pedida en el header `x-requested-path`.
- La API valida con `readAuthContext(headers)` y reenvía las cookies que Better Auth setea.
- La barra lateral no tiene selector de organización: la sesión está fija en la institución (`AppIdentity`, "SiGA" con el nombre de la institución).
- Cerrar sesión (`NavUser`, `CuentaDesactivadaCard`) vacía la caché de React Query. Si el producto guarda filtros por dispositivo en `localStorage`, el cierre de sesión es el lugar para limpiarlos.

## Plugins

- `organization`: tablas y endpoints de organizaciones y miembros. Roles en uso: `owner` (Administrador) y `member`. La API lo usa solo por `auth.api.*` desde `packages/api/src/services/memberships.ts`.
- `bearer`: permite `Authorization: Bearer` para clientes sin cookies (iOS).
- `nextCookies`: setea cookies desde Server Actions.

## Flujo iOS (futuro)

1. Google Sign-In nativo → `idToken`.
2. `POST /api/auth/sign-in/social { "provider": "google", "idToken": { "token": "<idToken>" } }`.
3. Guardar el header `set-auth-token` en Keychain y enviarlo como bearer.

## Variables

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `AUTH_RATE_LIMIT=off` apaga el límite de Better Auth (3 registros o inicios de sesión cada 10 segundos por IP, activo solo con `NODE_ENV=production`); lo usan únicamente los e2e, que corren contra un build de producción en CI y registran un usuario por test. En Google Cloud Console agregar `https://<dominio>/api/auth/callback/google` como redirect URI para cada ambiente.
