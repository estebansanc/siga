# Ambientes y deploy

| Ambiente   | Rama        | Base de datos (Neon)     | Vercel                                     | URL                         |
| ---------- | ----------- | ------------------------ | ------------------------------------------ | --------------------------- |
| Local      | —           | Docker/Homebrew o branch | `pnpm dev`                                 | `http://localhost:3000`     |
| Preview    | PR (manual) | branch `preview/pr-<n>`  | workflow `Preview`, URL comentada en el PR | `*.vercel.app` del deploy   |
| Staging    | `develop`   | branch `staging`         | preview con alias `STAGING_DOMAIN`         | `https://staging.<dominio>` |
| Producción | `main`      | branch `main`            | `--prod`, environment `production`         | `https://app.<dominio>`     |

Las URLs `*.vercel.app` del proyecto siguen sirviendo, pero las de referencia son las del dominio propio. `<dominio>` (raíz) queda libre para una landing en otro proyecto de Vercel.

## Principio

**GitHub Actions es el único que deploya.** `vercel.json` desactiva el auto-deploy de Git de Vercel para garantizar el orden `tests → migrar BD → deployar código`. Sin esto, Vercel deployaría código nuevo contra un schema viejo.

## Workflows

- `.github/workflows/ci.yml` (PR): lint, typecheck, tests, `openapi:check`, `migrate:check`. El job `e2e` corre solo en PRs a `main`.
- `.github/workflows/preview.yml` (manual, `workflow_dispatch` con el número de PR): crea el branch de Neon, migra, deploya una preview, comenta la URL y etiqueta el PR con `preview`. Se lanza con `gh workflow run preview.yml -f pr=<n>`.
- `.github/workflows/preview-cleanup.yml`: borra el branch de Neon al cerrar un PR con etiqueta `preview`.
- `.github/workflows/deploy-staging.yml` (push a `develop`): migra staging, Vercel compila en la nube y se asigna el alias `STAGING_DOMAIN`. El seed no corre en el deploy: la primera vez (y cada vez que cambie) se corre a mano contra el branch de Neon, `DATABASE_URL=<DIRECT_URL de staging> DIRECT_URL=<idem> pnpm db:seed`; sin la institución cargada nadie puede registrarse (`docs/modelo-de-datos.md`, "Seed").
- `.github/workflows/deploy-production.yml` (push a `main`): environment `production`, migra y deploya `--prod`. La aprobación de producción es el merge del PR `develop` → `main` (GitHub Free no permite required reviewers en repos privados).

## Configuración inicial

`bootstrap.sh` del plugin `ticket-flow` guía estos pasos y `doctor.sh` verifica que quedaron bien. Lo que hace cada uno:

### Neon

Con la CLI (`npm i -g neon && neon login`) todo se puede hacer sin copiar credenciales: `neon connection-string <branch> | gh secret set <NOMBRE>`.

1. Crear proyecto. El branch por defecto es `main` (producción).
2. Crear branch `staging` desde `main`.
3. Copiar las URLs pooled (`DATABASE_URL`) y directas (`DIRECT_URL`) de cada branch.
4. Crear una API key (`NEON_API_KEY`) y anotar `NEON_PROJECT_ID`.

### Vercel

1. Crear el proyecto apuntando a `apps/web` con root directory `apps/web`, framework Next.js, pero **sin** conectar Git (o conectarlo y dejar `git.deploymentEnabled: false`).
2. Agregar los dominios de producción y de staging al proyecto, y asignar los de staging a la rama `develop` por API (ver "Dominios"). Sin eso Vercel los trata como dominios de producción y cada deploy de producción se los queda.
3. Variables por environment (Production y Preview): `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` y `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID` y `STORAGE_SECRET_ACCESS_KEY` (Cloudflare R2, fotos de incidencias). Las de Production se cargan con `vercel env add <NOMBRE> production`; las de Preview, que son las de staging, desde el dashboard y **sin scope de rama**: sin Git conectado, Vercel no permite scope por rama y la CLI falla con "does not have a connected Git repository". `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` valen `https://app.<dominio>` en Production y `https://staging.<dominio>` en Preview; como `NEXT_PUBLIC_*` se fija en el build, cambiarlas exige un redeploy. `RATE_LIMIT` y `AUTH_RATE_LIMIT` no hacen falta en Vercel: vienen activos y solo se apagan (`off`) en los e2e. `NEXT_PUBLIC_APP_URL` es además la base de los links que van por email.
4. Token de Vercel (`VERCEL_TOKEN`), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
5. **Región y pooler.** Cada viaje a la base pesa lo que la distancia entre la función y Neon: la región de las funciones (`vercel project inspect`; por defecto `iad1`, Washington) tiene que coincidir con la del proyecto de Neon (`neon projects get <id>`; `aws-us-east-1` para `iad1`, `aws-sa-east-1` para `gru1`). Si no coinciden, fijar `"regions": ["<región>"]` en `apps/web/vercel.json` o mover el proyecto de Neon. `DATABASE_URL` tiene que ser la URL **pooled** de Neon (host con `-pooler`): `neon connection-string <branch> --pooled`; `DIRECT_URL` la directa, solo para migraciones. La ruta de la API declara `maxDuration = 60` para que lo diferido termine después de responder.

### Dominios

DNS en Cloudflare (plan Free). Cada subdominio de la app es un `CNAME` al destino que indica Vercel en la pestaña Domains del proyecto (hoy `cname.vercel-dns.com`; Vercel puede recomendar un destino propio del proyecto), siempre en modo **DNS only** (nube gris): con el proxy de Cloudflare activo Vercel no emite el certificado.

| Dominio                 | Ambiente   | `gitBranch` |
| ----------------------- | ---------- | ----------- |
| `app.<dominio>`         | producción | —           |
| `<proyecto>.vercel.app` | producción | —           |
| `staging.<dominio>`     | staging    | `develop`   |

Un dominio sin `gitBranch` es de producción y `vercel deploy --prod` se lo lleva: si a un dominio de staging le falta la rama, tras el próximo deploy de producción la URL de staging sirve producción, con su base de datos. El dashboard solo permite elegir rama con Git conectado, y conectar Git no es una opción (ver "Principio"), así que la rama se asigna por API con un token creado a mano en `vercel.com/account/tokens` (scope del equipo, vencimiento corto; la credencial de la CLI en `auth.json` no sirve para la API REST, responde `invalidToken`):

```bash
# Agregar un dominio de staging ya asignado a la rama
curl -X POST "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/domains?slug=<team>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"staging.<dominio>","gitBranch":"develop"}'

# Asignar la rama a un dominio que ya existe
curl -X PATCH "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/domains/staging.<dominio>?slug=<team>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"gitBranch":"develop"}'

# Verificar: los de staging con develop, los de producción con null
curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/domains?slug=<team>" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.domains[] | "\(.name) -> \(.gitBranch)"'
```

Para saber qué build sirve un dominio sin loguearse, pedirle a Better Auth la URL de login con Google: el `redirect_uri` lleva la base del `BETTER_AUTH_URL` con el que se compiló.

```bash
curl -s -X POST https://staging.<dominio>/api/auth/sign-in/social \
  -H 'content-type: application/json' -H 'origin: https://staging.<dominio>' \
  -d '{"provider":"google","callbackURL":"/"}'
```

Un redeploy sin commit (por ejemplo, tras cambiar variables) se hace re-ejecutando la última corrida del workflow del ambiente: `gh run rerun <id>` y `gh run watch <id> --exit-status`. Los workflows no tienen `workflow_dispatch`. Si un deploy de producción se llevó el dominio de staging, re-ejecutar el de staging lo devuelve, porque el paso `vercel alias set` lo vuelve a apuntar.

### GitHub

Secrets del repo: `NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. El check de migraciones corre contra el Postgres del propio job, no toca Neon.

Environments:

- `staging`: secret `DIRECT_URL` del branch `staging`; variable `STAGING_DOMAIN` (`staging.<dominio>`).
- `production`: secret `DIRECT_URL` del branch `main`.

### Google Cloud

Cliente OAuth 2.0 (Google Auth Platform → Clientes) con un redirect URI por ambiente: `http://localhost:3000/api/auth/callback/google`, `https://staging.<dominio>/api/auth/callback/google` y `https://app.<dominio>/api/auth/callback/google`. En Branding, `<dominio>` como dominio autorizado.

### Cloudflare R2

SiGA lo usa para las fotos de las incidencias de aulas (RF-15, ADR 006): sin él, reportar una incidencia con foto responde 503 nombrando las variables que faltan, y el resto de la app funciona igual. Un bucket privado por ambiente (staging y producción) y un token con permisos de lectura y escritura de objetos. Variables de Vercel, en Production y Preview:

| Variable                    | Valor                                           |
| --------------------------- | ----------------------------------------------- |
| `STORAGE_ENDPOINT`          | `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET`            | Nombre del bucket del ambiente                  |
| `STORAGE_ACCESS_KEY_ID`     | Access Key ID del token de R2                   |
| `STORAGE_SECRET_ACCESS_KEY` | Secret Access Key del token de R2               |

Las cuatro son obligatorias a la vez; localmente se dejan vacías (ver `.env.example`). La política CORS de cada bucket (Settings → CORS Policy) lleva en `AllowedOrigins` el origen exacto de su ambiente, `https://staging.<dominio>` o `https://app.<dominio>`: el navegador hace el `PUT` directo al bucket y sin ese origen la subida falla.

### Resend

1. Crear la cuenta (plan gratuito: 3.000 emails por mes, 100 por día) y agregar el dominio propio en Domains; cargar en el DNS los registros que indica (SPF, DKIM y el de retorno) y esperar la verificación. No se puede enviar desde `vercel.app`.
2. Crear una API key con permiso de envío y cargarla como `RESEND_API_KEY` en Vercel (Production y Preview).
3. `EMAIL_FROM` con una casilla del dominio verificado, por ejemplo `<Producto> <no-reply@<dominio>>`. Mientras el dominio no esté verificado, dejar el placeholder: sin API key los emails quedan `PENDING` en `EmailOutbox` y la app funciona igual (`docs/api.md`, "Emails").

## Local sin Docker

```bash
brew services start postgresql@16
psql -d postgres -c "CREATE ROLE app LOGIN PASSWORD 'app' CREATEDB;"
psql -d postgres -c "CREATE DATABASE app OWNER app;"
```

`.env` con `DATABASE_URL` y `DIRECT_URL` = `postgresql://app:app@localhost:5432/app`.

## Flujo de ramas

`feat/*` → PR a `develop` → merge deploya staging → PR `develop` → `main` (con e2e en CI) → merge deploya producción.

## Minutos de Actions

El repo es privado y el plan Free incluye 2.000 minutos por mes; cuando se agotan, los deploys quedan bloqueados por facturación hasta el reinicio mensual (o hasta subir el límite de gasto). Por eso GitHub corre solo lo que no puede hacerse en local:

| Qué                                   | Dónde corre                                                 | Costo aproximado                                    |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Lint, typecheck, unit, integración    | Worktree local y job `checks` de cada PR                    | 2 a 10 min por PR (menos con caché remota de Turbo) |
| E2E (Playwright, build de producción) | Worktree local (`worktree.sh e2e`); CI solo en PRs a `main` | 5 a 10 min por release                              |
| Preview por PR                        | Manual (`Preview`)                                          | 3 min cuando se pide                                |
| Deploy de staging y producción        | Siempre en Actions (migra con secretos y deploya)           | 3 min por merge                                     |

Un job saltado por `if` no consume minutos; cada job que corre se factura redondeado al minuto. Si un PR falla en CI por algo que la suite local ya cubre, corregir y verificar en local antes de volver a pushear: cada rerun cuesta lo mismo que el primero.

## Remote cache de Turbo

`bootstrap.sh` agrega a `turbo.json` el equipo de Vercel en `remoteCache.teamSlug`, así cualquier checkout (repo principal, worktrees, CI) habla con la misma caché. `ci.yml` pasa además `TURBO_TOKEN` (secret) y `TURBO_TEAM` (variable del repo). El objetivo es que `lint`, `typecheck` y `test` que ya pasaron en un worktree sobre la misma revisión se reproduzcan en CI desde la caché (`cache hit, replaying logs`), para lo cual los hashes tienen que coincidir: `CI` no está en `globalEnv`, `TEST_DATABASE_URL` es `passThroughEnv` y las variables de entorno de `build` están declaradas solo en `apps/web/turbo.json` (los paquetes no tienen build, y si heredaran esas variables, `lint` y `typecheck` cambiarían de hash según el `.env` de cada máquina). Configuración, una sola vez:

1. En Vercel → Account Settings → Tokens, crear un token con alcance a la cuenta del proyecto.
2. En GitHub → Settings → Secrets and variables → Actions: secret `TURBO_TOKEN` con ese token y variable `TURBO_TEAM` con el slug de la cuenta.
3. En la máquina de desarrollo: `pnpm turbo login`. El token queda en `~/Library/Application Support/turborepo/auth.json` (campo `expiresAt`, en segundos) y dura pocos días; cuando vence, Turbo sigue corriendo pero cada tarea muestra `WARNING Insufficient permissions to write to remote cache` y CI deja de encontrar los artefactos. `doctor.sh` (plugin `ticket-flow`, chequeo `turbo.token`) avisa cuando quedan menos de 48 horas; repetir `pnpm turbo login`.

Sin token Turbo corre igual, solo sin caché compartida. Para comprobar que una tarea subió: `pnpm turbo test --filter=@repo/domain --force -vv 2>&1 | grep -i uploading`.

## Versionado

La versión que se ve al pie de Configuración y "Qué hay de nuevo" salen de un único archivo versionado, `apps/web/lib/releases.json`:

```json
{
  "releases": [
    { "stage": "Alpha", "number": "0.1", "date": "2026-10-20", "changes": ["Ahora podés…"] },
    { "stage": "Alpha", "number": "0.0", "date": "2026-10-13", "changes": [] }
  ]
}
```

- La primera entrada es la versión actual. `stage` es la etapa (`Alpha`, `Beta`, o `""` para no mostrar ninguna) y `number` un `X.Y` como string. `apps/web/lib/releases.ts` expone `currentRelease` y `formatVersionLabel` (`Versión Alpha 0.1`). `changes` puede estar vacío (el template arranca así): la UI muestra "Sin cambios registrados.".
- `changes` son bullets a nivel producto, en es-AR, sin ningún detalle técnico: es lo que lee el usuario.
- Nadie edita el archivo a mano: lo actualiza `/ticket-flow:prod-deploy` con `release.sh publish` (script del plugin `ticket-flow`), que toma como base el archivo de `origin/main` (la verdad de lo que está en producción), agrega la versión nueva encima y la commitea en la rama que va a producción (`develop` cuando van todos los tickets, `release/...` cuando va uno). La skill propone por defecto la misma etapa y el número +0.1 (`release.sh next`) y pide confirmar versión y notas de versión (Qué hay de nuevo) antes de commitear. Detalle en `docs/flujo-de-tickets.md`.
- Como `main` es la base, el historial de versiones queda completo aunque se hagan releases parciales desde ramas `release/...`.
