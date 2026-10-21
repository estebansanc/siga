# Autenticación

Better Auth en `packages/auth/src/server.ts`, montado en `apps/web/app/api/auth/[...all]/route.ts`.

## Métodos

- **Email y contraseña** (`emailAndPassword`, mínimo 8 caracteres).
- **Google** (`socialProviders.google`, `prompt: "select_account"`). Sin `GOOGLE_CLIENT_ID` el botón de Google no funciona; el resto de la app sí.

## Institución y perfil

SiGA tiene una sola institución (CFG-2): la organización `utn-frt` que carga el seed (`institutionSlug` en `packages/domain/src/institucion.ts`). Nadie crea organizaciones (`allowUserToCreateOrganization: false`). En `databaseHooks.session.create.before` (la primera sesión de la cuenta, no al crear el usuario) una cuenta sin membresía entra a la institución como `member` con perfil `ESTUDIANTE` en `UserProfile`, el único perfil que una persona puede asignarse sola; Docente, Bedel y Autoridad los asigna un administrador. Ese mismo hook fija `activeOrganizationId` prefiriendo la membresía `owner` y, si no hay, la primera. Sin institución cargada el hook falla con "Corré pnpm db:seed": el seed es obligatorio en local, en e2e y en staging. El bedel del seed (`demo@example.com`) es el `owner` de la institución y por eso ve Configuración.

## Contexto de sesión

`getAuthContext(headers)` (`packages/auth/src/session.ts`) devuelve `{ userId, organizationId, role, perfil, userName, userEmail, lostOrganization }`. La membresía y el perfil se leen en **cada request**: la cookie cachea la sesión 5 minutos y no se invalida al quitar a un miembro ni al desactivar una cuenta, así que si la organización activa de la sesión ya no tiene una membresía se vuelve a la organización propia (o a la primera membresía), y una cuenta sin `UserProfile` o con `activo = false` no obtiene contexto (401 en la API, login en la web). Sin ninguna membresía la API responde 401. `lostOrganization` (`{ id, name } | null`) nombra esa organización cuando pasó eso: `removeMembership` deja `activeOrganizationId` de la cookie apuntando a ella a propósito (no la limpia) para que este cálculo pueda leer su nombre antes de caer a la propia; se sigue informando en cada request mientras la cuenta no vuelva a elegir activamente una organización (`auth.api.setActiveOrganization` sí la corrige). `GET /me` expone el mismo dato y el shell (`apps/web/components/layout/lost-organization-notice.tsx`) lo usa para el aviso "Ya no formás parte de..." y para volver al inicio en la primera navegación posterior, sea cual sea la pantalla (ver `docs/ui.md`). `role` es `owner` (Administrador) o `member`; `perfil` es `ESTUDIANTE`, `DOCENTE`, `BEDEL` o `AUTORIDAD`.

`userName` y `userEmail` vienen de la cookie; `GET /me` los lee de la base para que un cambio hecho en Mi perfil (`PATCH /me`) se vea sin esperar a que venza la caché de sesión.

## Autorización

El middleware `ownerOnly` (`packages/api/src/middleware.ts`) protege las escrituras de Configuración (ajustes, invitaciones, quitar miembros) con 403 `FORBIDDEN` en español; las lecturas (`GET /settings`, `GET /members`) siguen abiertas a cualquier miembro. Las rutas de SiGA llevan `perfilOnly(...perfiles)` según la matriz de permisos de `docs/producto/requerimientos.md`, y el servicio vuelve a verificarlo con `assertPerfil` (`packages/api/src/services/permisos.ts`), que registra todo acceso denegado en `audit_log` (`entity: "Permiso"`, `action: "acceso_denegado"`) antes de responder 403 "Acceso denegado" (SEG-6). `GET /me` expone quién es la sesión activa (usuario, rol, perfil) y las organizaciones de la cuenta.

## Invitaciones

El Administrador invita por email desde Configuración; la API crea la invitación con `auth.api.createInvitation` (`role: member`, `invitationExpiresIn` 7 días, `requireEmailVerificationOnInvitation: false` porque las cuentas por email no verifican el email) y manda el email por la cola propia: `packages/auth` no usa `sendInvitationEmail` ni `organizationHooks` porque `packages/api` lo importa y la cola vive en la API. El link `/invitacion/{id}` pide sesión (el proxy redirige a `/login?next=` y el registro respeta `next` igual que el login); con sesión, `GET /api/v1/invitations/{id}` dice el estado y si es para el email de la sesión, y aceptar o rechazar pasa por `auth.api.acceptInvitation` / `rejectInvitation` con los headers de la request. Como Better Auth deja activa la organización aceptada, después de aceptar la API vuelve a fijar la propia con `auth.api.setActiveOrganization` si la cuenta tiene una (en SiGA las cuentas nuevas no la tienen: queda activa la aceptada). Las invitaciones son del template y en SiGA no tienen uso real; la gestión de usuarios (RF-10) las reemplazará. Cancelar usa `auth.api.cancelInvitation`; reenviar solo encola otro email con el mismo link (Better Auth extendería el vencimiento al reenviar). Quitar un miembro borra el `Member` directamente, sin tocar `activeOrganizationId` de las sesiones que apuntaban a esa organización (queda stale a propósito, para el aviso de la sección anterior).

## Sesión en la web

- `proxy.ts` redirige a `/login?next=<ruta>` si no hay cookie de sesión (chequeo rápido con `getSessionCookie`), pero solo para las rutas internas conocidas (`protectedRoutes`: `/`, `/configuracion`, `/mi-perfil`, `/invitacion` y las pantallas de SiGA, `/clases`, `/novedades`, `/estado-institucional`, `/preferencias` y las secciones "Próximamente"): el proxy no sabe qué rutas existen de verdad, así que cualquier otra URL (incluida una que no exista) sigue de largo y la resuelve Next, que responde 404 con la pantalla neutra de `apps/web/app/not-found.tsx` en vez de pedir login primero. Esa lista es manual: toda ruta nueva de la app va también ahí, y si una se saca de la app hay que sacarla de la lista. `/login` y `/registro` redirigen a `/` cuando ya hay sesión y, sin sesión, vuelven a `next` después de entrar (solo rutas internas; el link entre ambas lo conserva). `/~offline` no redirige en ningún sentido.
- Los Server Components validan la sesión real con `requireSession()` (`apps/web/lib/session.ts`).
- La API valida con `readAuthContext(headers)` y reenvía las cookies con las que Better Auth renueva la caché.
- El selector de organización de la barra lateral (`apps/web/components/layout/organization-switcher.tsx`) cambia la organización activa desde el cliente con `authClient.organization.setActive` (plugin `organization`, sin endpoint propio): la sesión queda en la elegida en la próxima request y el shell navega a `/` con `router.refresh()` para que el layout la vuelva a leer.
- Cerrar sesión (`NavUser`, `InvitationCard`) vacía la caché de React Query. Si el producto guarda filtros por dispositivo en `localStorage`, `resetForNewOrganization` (`apps/web/lib/organization-switch.ts`) y el cierre de sesión son los lugares para limpiarlos.

## Plugins

- `organization`: tablas y endpoints de organizaciones, miembros e invitaciones. Roles en uso: `owner` (Administrador) y `member`. La API lo usa solo por `auth.api.*` desde `packages/api/src/services/memberships.ts`.
- `bearer`: permite `Authorization: Bearer` para clientes sin cookies (iOS).
- `nextCookies`: setea cookies desde Server Actions.

## Flujo iOS (futuro)

1. Google Sign-In nativo → `idToken`.
2. `POST /api/auth/sign-in/social { "provider": "google", "idToken": { "token": "<idToken>" } }`.
3. Guardar el header `set-auth-token` en Keychain y enviarlo como bearer.

## Variables

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `AUTH_RATE_LIMIT=off` apaga el límite de Better Auth (3 registros o inicios de sesión cada 10 segundos por IP, activo solo con `NODE_ENV=production`); lo usan únicamente los e2e, que corren contra un build de producción en CI y registran un usuario por test. En Google Cloud Console agregar `https://<dominio>/api/auth/callback/google` como redirect URI para cada ambiente.
