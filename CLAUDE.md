# SiGA

SiGA: sistema web de gestión operativa académica para la UTN FRT que centraliza en tiempo real el estado de la institución, las aulas, la asistencia docente, las novedades de clase y los avisos institucionales, para estudiantes, docentes, bedeles y autoridades. Producto en `docs/producto/`; detalle técnico en `README.md` y `docs/`.

## Reglas críticas

- Respetar el stack actual: Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui + React Query en `apps/web`; Hono + `@hono/zod-openapi` en `packages/api`; Prisma 7 sobre Postgres (Neon) en `packages/db`; Better Auth en `packages/auth`; zod en `packages/domain`. No agregar dependencias ni cambiar librerías sin que el ticket lo pida.
- UI solo con componentes de shadcn/ui (`packages/ui`), sus bloques o registries compatibles. Nunca un componente visual desde cero; extender uno existente si falta algo (`docs/ui.md`, ADR 007).
- Código limpio y self-explanatory: nombres descriptivos, funciones chicas, TypeScript estricto. Comentarios solo para un "por qué" no obvio.
- Todo cambio lleva unit tests e integración (`docs/testing.md`): dominio o web con Vitest, API con Vitest contra Postgres real; e2e con Playwright cuando toca UI.
- Si cambia el schema Prisma: migración en `packages/db/prisma/migrations` y `docs/modelo-de-datos.md`. Si cambia una ruta de la API: `pnpm api:openapi` y commitear `openapi.json`. Si cambia comportamiento documentado: actualizar el `docs/*.md` correspondiente.
- La lógica de negocio vive en `packages/api/src/services`; la API debe seguir siendo consumible por un cliente iOS.
- Rutas tipadas de Next: nunca `as Route` (eslint lo marca redundante); usar un type guard (`isInternalRoute` en `apps/web/components/auth/auth-routes.ts`). `pnpm typecheck` en `apps/web` corre `next typegen` antes de `tsc`, así que valida las rutas tipadas igual que `next build`, en local y en CI.
- Minutos de GitHub Actions: el CI de un PR a `develop` corre solo lint, typecheck, tests y contratos; el e2e de CI corre únicamente en PRs a `main` y la preview es manual (`docs/ambientes-y-deploy.md`). Antes de abrir un PR, la suite completa y `worktree.sh e2e` deben haber pasado en local.
- Ramas `feat/<issue>-<slug>` → PR a `develop` (squash) → staging; `develop` → `main` (squash) → producción. Nunca `push --force` sin `--with-lease`.

## Tablero y skills

Los tickets viven en GitHub Projects (`docs/flujo-de-tickets.md`). `/ticket-flow:refine`, `/ticket-flow:develop` y `/ticket-flow:prod-deploy` vacían Backlog, Ready/In progress e In review respectivamente. Skills, agentes y scripts (`board.sh`, `pr.sh`, `worktree.sh`, `release.sh`, `flow.sh`, en el `PATH`) vienen del plugin `ticket-flow` (`estebansanc/ticket-flow`), declarado en `.claude/settings.json`; este repo aporta solo `.claude/flow.json` con todo lo que identifica al producto (repo, Project, URLs, bases, comandos del stack, usuarios de QA por perfil).
