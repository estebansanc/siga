# Arquitectura

## Monorepo

pnpm workspaces + Turborepo. Un solo artefacto deployado: `apps/web`. Los paquetes se consumen como fuente TypeScript (sin build propio); Next.js los transpila con `transpilePackages`.

```
apps/web  ──▶  packages/api ──▶ packages/db
   │  │  │          │  └──────▶ packages/auth ──▶ packages/db
   │  │  └────────▶ packages/domain
   │  └───────────▶ packages/ui
   └──────────────▶ packages/auth
```

Reglas de dependencia:

- `domain` no depende de nada del repo. Solo zod. Es la fuente de verdad de validaciones y enums.
- `db` depende de Prisma. Expone el cliente con auditoría y medición, y los tipos generados.
- `auth` depende de `db`. Instancia Better Auth y expone `getAuthContext` / `requireAuthContext`.
- `api` depende de `db`, `auth`, `domain`. Nada de Next.js adentro.
- `ui` depende solo de React, shadcn y Tailwind.
- `web` depende de todos.

## Por qué Hono dentro de Next.js

La API vive en `packages/api` como una app Hono independiente. Next.js solo la monta en `apps/web/app/api/v1/[[...route]]/route.ts` con `hono/vercel`. Ventajas:

- Un solo deploy en Vercel.
- Spec OpenAPI generada a partir de los schemas zod (`packages/api/openapi.json`) para generar el cliente móvil.
- Cliente tipado (`hc`) para la web sin duplicar tipos.
- Extraíble: `createApi()` corre en Node, Bun, Lambda o un contenedor cambiando solo el adaptador.

## Cómo se consume la API desde la web

- **Server Components** llaman a los servicios de `packages/api/services` directamente (ejemplo: `apps/web/lib/me-cache.ts`, que `app/(app)/layout.tsx` usa para quién-soy). Sin HTTP interno.
- **Client Components** usan el cliente `hc` (`apps/web/lib/api-client.ts`) con React Query (`apps/web/hooks/*`).

Ambos caminos ejecutan la misma lógica de `packages/api/src/services`.

## Capas dentro de la API

```
routes/       createRoute + handler: valida, llama al servicio, devuelve DTO
services/     lógica de negocio, acceso a Prisma, serialización a DTO
integrations/ email (Resend), storage S3 (fotos de incidencias e imágenes de planos)
```

Las rutas no contienen lógica. Los servicios no conocen Hono.

Lo que puede esperar a después de responder (emails, integraciones) pasa por `runDeferred` (`src/deferred.ts`): la app recibe un adaptador en `createApi({ defer })` y lo deja en un `AsyncLocalStorage` durante la request. Next lo inyecta con `after` desde la ruta; `packages/api` sigue sin depender de Next y, sin adaptador, todo corre en línea. La medición por request (`Server-Timing`, `src/timing.ts`) usa el mismo mecanismo desde `@repo/db`, que es donde vive la extensión de Prisma que suma cada consulta.

## Tenancy

El tenant es la **organización** = `Organization` de Better Auth. En SiGA es la institución, una sola y precargada por el seed; una cuenta nueva entra a ella como Estudiante en su primera sesión (hook en `packages/auth/src/server.ts`, ver `docs/autenticacion.md`). Cada request lleva `organizationId` y `perfil` desde la sesión activa y todo servicio filtra por el primero y controla permisos con el segundo. Las entidades del producto cuelgan de la organización con `organizationId`.

## Servicios de SiGA

`packages/api/src/services`: `permisos` (`assertPerfil`, acceso denegado auditado), `datos-academicos` (carreras, materias, comisiones, generación de clases sobre `packages/db/src/clases-programadas.ts`), `estado-institucional` (vigente, historial, cambio con suspensión de clases en la misma transacción), `clases` (listado por día y ámbito con finalización perezosa: al consultar, toda clase cuya franja terminó pasa a Finalizada; no hay cron), `novedades` (publicar y finalizar con cambio de estado de las clases y reserva de aula, todo o nada), `preferencias` (comisiones seguidas) y `aulas` (gestión del Bedel: alta, edición, baja, reactivación, ocupación calculada y clases afectadas; y disponibles para un cambio de aula; y el plano de aulas, con el estado de cada aula calculado en `listarPlanoAulas` a partir de `estadoPlanoDeAula` de `packages/domain`). El listado de aulas y el plano (`usePlanoAulas`) se actualizan por la consulta periódica de 30 s, que cumple los 60 s de RF-02. `packages/db` depende de `packages/domain` por los helpers de tiempo que usa la generación de clases.

## Tiempo real

Por consulta periódica, no por push: los hooks de la web (`apps/web/hooks/use-estado-institucional.ts`, `use-clases.ts`, `use-novedades.ts`) usan React Query con `refetchInterval: 30_000` y `refetchOnWindowFocus`, y cada mutación invalida `clases`, `novedades` y el estado institucional. Cumple el máximo de 60 segundos de RNF-02.

## Auditoría

`packages/db/src/audit-extension.ts` es una extensión de Prisma que registra en `audit_log` cada `create`, `update` y `delete` de las entidades listadas en `auditedModels` (el producto agrega las suyas). El actor viene de un `AsyncLocalStorage` que el middleware de la API setea por request (`runWithAuditActor`).

## Cómo extraer la API a un servicio propio

1. Crear `apps/api` con un servidor Hono (`@hono/node-server`) que importe `createApi()`.
2. Mover `BETTER_AUTH_URL` y cookies a un dominio compartido o usar solo bearer tokens.
3. Apuntar `NEXT_PUBLIC_APP_URL` / `createApiClient(baseUrl)` al nuevo host.
4. Nada en `packages/api` cambia.
