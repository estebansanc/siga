# product-template

Template para arrancar un producto nuevo con la misma base que ya funciona en producción: PWA en español (es-AR) con autenticación, organizaciones multi-tenant con miembros, API REST con OpenAPI consumible desde la web y desde un cliente móvil, y el flujo de tickets del plugin `ticket-flow` listo para usar. No trae ningún dominio: el producto se construye encima.

## Qué incluye

- **Autenticación** con Better Auth: email y contraseña, Google, bearer token para móviles. Pantallas de login, registro (con verificación de correo) y activación de cuenta.
- **Organizaciones**: cada cuenta nace con una organización propia donde es Administrador; invita miembros por email, los quita, cambia de organización desde la barra lateral.
- **Configuración** (nombre de la organización, turnos, miembros, versión y Novedades) y **Mi perfil** (nombre del usuario).
- **Infraestructura**: cola de emails con Resend, rate limit en Postgres, auditoría y medición por request, cliente de storage S3/R2 opcional, PWA instalable con página offline.
- **Calidad**: unit tests, integración contra Postgres real, e2e con Playwright, lint, typecheck, contratos (`openapi.json` y migraciones) y CI en GitHub Actions.

## Cómo arrancar un producto

```bash
gh repo create <owner>/<repo> --template estebansanc/product-template --private
git clone git@github.com:<owner>/<repo>.git && cd <repo>
```

Después, desde Claude Code en la raíz del repo, el plugin `ticket-flow` (`estebansanc/ticket-flow`, ya declarado en `.claude/settings.json`) guía todo lo demás con `bootstrap.sh`: nombre del producto, `.claude/flow.json`, GitHub Project, ambientes, Neon, Vercel y secretos. Lo que el bootstrap completa está marcado en el repo como `<Producto>`, `<owner>/<repo>`, `<dominio>` y similares.

## Dónde cambiar el nombre del producto

En un solo lugar: `apps/web/lib/product.ts` (`productName`). Título de la pestaña, manifest de la PWA, barra lateral y pantallas de acceso lo importan de ahí. `bootstrap.sh` lo reemplaza; a mano, cambiar el literal alcanza. La primera línea de `CLAUDE.md` describe el producto para Claude Code.

## Stack

| Capa          | Tecnología                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| Web           | Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui, React Query      |
| API           | Hono + `@hono/zod-openapi` montado en `/api/v1` dentro de Next.js          |
| Auth          | Better Auth (Google + email/contraseña, organizaciones, bearer para móvil) |
| Base de datos | Postgres en Neon, Prisma 7                                                 |
| Email         | Resend, con cola de salida en base                                         |
| Archivos      | Cliente S3-compatible (Cloudflare R2) opcional, URLs firmadas              |
| Monorepo      | pnpm workspaces + Turborepo                                                |
| Deploy        | Vercel, GitHub Actions (migraciones antes del deploy)                      |

## Correr en local

Requisitos: Node 22+ (ver `.nvmrc`), pnpm 11, y Docker o un Postgres local en `localhost:5432`.

```bash
pnpm dev:local
```

Ese comando crea `.env` con valores locales si no existe, instala dependencias, levanta Postgres con Docker si no hay uno corriendo, aplica migraciones, carga el seed de SiGA y abre la app en http://localhost:3000. Usuarios del seed (clave `demo1234`): `demo@example.com` (Bedel), `docente@example.com` (Docente), `estudiante@example.com` (Estudiante que sigue 5K2) y `autoridad@example.com` (Autoridad). El seed es obligatorio: carga la institución a la que entran las cuentas nuevas. Login con Google, emails y storage requieren completar `GOOGLE_*`, `RESEND_*` y `STORAGE_*` en `.env` (ver `.env.example`).

Paso a paso, si preferís hacerlo a mano:

```bash
pnpm install
cp .env.example .env            # completá DATABASE_URL, DIRECT_URL y BETTER_AUTH_SECRET
docker compose up -d            # Postgres local en localhost:5432 (usuario/clave/db: app)
pnpm db:migrate                 # aplica migraciones (prisma migrate dev)
pnpm db:seed                    # institución, usuarios por perfil, datos académicos y clases
pnpm dev                        # http://localhost:3000
```

Sin Docker: `brew services start postgresql@16` y creá el rol y la base `app` (ver `docs/ambientes-y-deploy.md`).

Rutas útiles: `/` (Mis clases de hoy), `/clases` (búsqueda), `/novedades`, `/estado-institucional`, `/preferencias`, `/configuracion`, `/mi-perfil`, `/api/v1/docs` (Swagger UI) y `/api/v1/openapi.json`.

## Suite de calidad

| Comando                                 | Qué hace                                                        |
| --------------------------------------- | --------------------------------------------------------------- |
| `pnpm turbo lint typecheck test`        | Lint, tipos, unit e integración (API contra `app_test`)         |
| `pnpm --filter @repo/api openapi:check` | `openapi.json` al día con las rutas                             |
| `pnpm --filter @repo/db migrate:check`  | `schema.prisma` al día con las migraciones                      |
| `pnpm test:e2e` / `CI=1 pnpm test:e2e`  | Playwright contra `app_e2e` (`CI=1` usa un build de producción) |
| `pnpm api:openapi`                      | Regenera `packages/api/openapi.json` (commitealo)               |
| `pnpm db:migrate` / `pnpm db:deploy`    | Crea o aplica migraciones                                       |

Las bases de test se crean una vez: `psql -d postgres -c "CREATE DATABASE app_test OWNER app;"` y lo mismo para `app_e2e` (`docs/testing.md`).

## Estructura

```
apps/web          Next.js: páginas, componentes, PWA, monta la API y Better Auth
packages/api      Hono: rutas OpenAPI, servicios, integraciones (email, storage)
packages/auth     Better Auth server/client y helpers de sesión
packages/db       Prisma: schema, migraciones, cliente con auditoría, seed
packages/domain   Schemas zod compartidos (sin dependencias del repo)
packages/ui       shadcn/ui: componentes, estilos, hooks compartidos
packages/config   tsconfig y ESLint compartidos
docs/             Documentación por tema y ADRs
```

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-de-datos.md)
- [API](docs/api.md)
- [Autenticación](docs/autenticacion.md)
- [UI con shadcn](docs/ui.md)
- [PWA](docs/pwa.md)
- [Ambientes y deploy](docs/ambientes-y-deploy.md)
- [Migraciones](docs/migraciones.md)
- [Testing](docs/testing.md)
- [Flujo de tickets](docs/flujo-de-tickets.md)
- [Decisiones (ADRs)](docs/decisiones/)
