# Flujo de tickets

Los requerimientos viven como issues en el GitHub Project del repo (`<owner>/<repo>`, número en `.claude/flow.json`). El campo `Status` es el tablero:

| Columna     | Qué contiene                                                               | Quién la vacía             |
| ----------- | -------------------------------------------------------------------------- | -------------------------- |
| Backlog     | Issues en lenguaje natural, con adjuntos y comentarios, sin refinar        | `/ticket-flow:refine`      |
| Ready       | Tickets 100% refinados y con dependencias analizadas                       | `/ticket-flow:develop`     |
| In progress | Tickets en desarrollo o con PR abierto                                     | `/ticket-flow:develop`     |
| In review   | Tickets mergeados en `develop` y deployados en staging, para probar a mano | `/ticket-flow:prod-deploy` |
| Done        | Tickets deployados en producción (GitHub cierra el issue al llegar acá)    | —                          |

Un issue nuevo en el repo entra solo a Backlog (workflow "Auto-add to project").

## Ticket refinado

El ticket define **qué** se construye (producto, alcance, comportamiento observable) sin ambigüedad. El **cómo** (archivos, funciones, tests concretos) lo resuelven el developer y el reviewer durante `/ticket-flow:develop`. Título de hasta 70 caracteres y body de hasta 6.000 caracteres con estas secciones H2, en este orden:

1. **Descripción**: requerimiento completo, sin ambigüedad, con los adjuntos originales enlazados. Cierra con `Decisiones tomadas` (defaults que el refinador asumió, con su porqué) y, si hace falta, `Fuera de alcance (pendiente de definir)` para la parte del pedido que espera una respuesta del autor.
2. **Criterios de aceptación**: checklist observable por el usuario (máximo 12).
3. **Criterios técnicos**: hasta 10 bullets orientativos: áreas a tocar, endpoints, cambio de schema, componentes shadcn a reutilizar, capas de test exigidas (unit + integración, e2e si toca UI), `openapi.json` y `docs/` a actualizar. Sin código, selectores ni números de línea.
4. **Criterios de QA**: checklist autocontenido de lo que un QA revisa (máximo 8).
5. **Paso a paso en Staging**: hasta 10 pasos contra `https://staging.<dominio>` con los usuarios de QA que declara `flow.json` (`product.qaUsers`, uno por perfil: Bedel `demo@example.com`, Docente `docente@example.com`, Estudiante `estudiante@example.com`, Autoridad `autoridad@example.com`, todos con clave `demo1234`). Son los únicos que existen en staging; cada paso usa el del perfil que lo ejecuta.
6. **Dependencias**: `Independiente` o `Depende de #N` / `Bloquea a #M`. Define qué tickets se desarrollan en paralelo (un worktree cada uno) y cuáles en secuencia (un worktree compartido, en orden).
7. `<details>` con el requerimiento original y el marcador `<!-- refined:v1 -->`.

Los comentarios del issue se responden con un único comentario que dice cómo se contempló cada uno. Los comentarios automáticos terminan en `<!-- bot -->`; así las skills distinguen una respuesta humana.

El label `needs-info` se usa solo cuando falta una decisión de negocio sin default razonable o el pedido se contradice: el refinador deja las preguntas en un comentario y el ticket se salta hasta que el autor responda en el issue. Las dudas técnicas nunca bloquean: el refinador decide y lo documenta. Si el validador sigue con objeciones tras dos rondas, o deja notas, el ticket pasa igual a Ready con un comentario `Observaciones del refinamiento` para el developer y el reviewer.

## Skills

Vienen del plugin `ticket-flow` ([estebansanc/ticket-flow](https://github.com/estebansanc/ticket-flow)), declarado en `.claude/settings.json`; se corren desde Claude Code en la raíz del repo y cada una itera hasta vaciar su columna.

| Skill                      | Vacía               | Argumentos                                              |
| -------------------------- | ------------------- | ------------------------------------------------------- |
| `/ticket-flow:refine`      | Backlog             | `analysis=<modelo>` `parallel=<n>`                      |
| `/ticket-flow:develop`     | Ready e In progress | `analysis=<modelo>` `execution=<modelo>` `parallel=<n>` |
| `/ticket-flow:prod-deploy` | In review           | `execution=<modelo>` `analysis=<modelo>`                |

Modelos por defecto: `opus` para análisis (refinar, validar, dependencias, review) y `sonnet` para ejecución (desarrollar, PR y deploy). Ejemplo: `/develop analysis=opus execution=sonnet parallel=2`.

La skill es un orquestador con contexto chico; el trabajo lo hacen los subagentes del plugin (`ticket-flow:<agente>`) que reciben solo el número de issue y devuelven una respuesta de pocas líneas:

| Agente                      | Rol                                                                                     | Grupo     |
| --------------------------- | --------------------------------------------------------------------------------------- | --------- |
| `issue-refiner`             | Reescribe el issue al formato refinado, responde comentarios, fija `Size`               | análisis  |
| `issue-refinement-checker`  | Aprueba o rechaza el refinamiento a nivel producto (máximo 2 rondas, effort medio)      | análisis  |
| `issue-dependency-analyzer` | Escribe la sección Dependencias y arma el plan de worktrees                             | análisis  |
| `issue-developer`           | Implementa el ticket con tests en su worktree; corrige hallazgos de review y de CI      | ejecución |
| `issue-reviewer`            | Revisa el diff contra los criterios, corre la suite, clasifica riesgo (máximo 3 rondas) | análisis  |
| `issue-staging-deployer`    | PR, CI, squash merge y espera del deploy con smoke test                                 | ejecución |
| `release-notes-writer`      | Redacta las Novedades de la versión (solo producto) a partir de los tickets que salen   | análisis  |

### `/ticket-flow:develop` en detalle

1. Reanuda lo que quedó en In progress según haya rama, PR abierto o PR mergeado.
2. Agrupa los tickets Ready por dependencias: `worktree-<n>` para independientes, `worktree-<n1>-<n2>` para cadenas.
3. Por ticket: mueve a In progress → developer → reviewer (vuelve al developer si hay hallazgos Crítico/Alto/Medio) → PR a `develop` con `Refs #n` → CI (vuelve al developer si falla) → squash merge → deploy a staging → mueve a In review con un comentario con PR, commit y URL.

Los worktrees viven en el directorio que indica `flow.json` (`../<repo>-worktrees/`) con su propio `.env`, bases `<prefijo>_test_<n>` y `<prefijo>_e2e_<n>` y puertos propios (`.env.worktree`, derivados del número de ticket), así varios tickets corren tests a la vez sin pisarse.

Los agentes tienen un límite de iteraciones. Si el developer o el reviewer se cortan sin reporte, la skill los reanuda por `SendMessage` (mismo contexto) pidiendo que sigan desde `git status` y `git log`; el developer commitea por etapas (API, UI, docs) justamente para que un corte no pierda trabajo. Tras dos reanudaciones sin reporte el ticket se marca bloqueado.

### `/ticket-flow:prod-deploy` en detalle

1. Pregunta si se deployan todos los tickets de In review (PR `develop` → `main`) o uno solo (rama `release/<n>` desde `main` con cherry-pick del squash commit del ticket y de sus dependencias).
2. Versión y Novedades: `release-notes-writer` escribe los bullets a nivel producto de los tickets incluidos; `release.sh next` propone la versión (misma etapa que la de `origin/main`, número +0.1); una sola `AskUserQuestion` confirma versión (editable: otra etapa, sin etapa u otro número) y notas (editables). `release.sh publish <rama> <etapa> <numero> <notas>` agrega la entrada a `apps/web/lib/releases.json` sobre la base de `origin/main` y la commitea y pushea en la rama que va a producción (en `develop` eso redeploya staging con la versión nueva antes del merge a `main`).
3. El deployer abre el PR `Release: Versión <etapa numero> (#n1, #n2)` con las Novedades en el body y `Closes #n` por ticket, espera CI, mergea, espera el deploy de producción y hace smoke test. La skill mueve a Done y comenta en cada ticket la versión, la URL y el commit.

Si el deploy falla, el commit de versión queda en la rama; el arreglo entra por `develop` y el próximo `/ticket-flow:prod-deploy` vuelve a proponer desde lo que haya en `main`. Detalle del archivo en `docs/ambientes-y-deploy.md`, sección "Versionado".

## Scripts

En `bin/` del plugin (están en el `PATH` de Claude Code mientras el plugin está habilitado), usados por skills y agentes para no gastar tokens en operaciones deterministas:

- `flow.sh`: `get <jq-path>` (un valor de `flow.json`), `show` (resumen del producto para refinar, validar y redactar Novedades), `check` (valida que `flow.json` tenga todas las claves). Los demás scripts lo incluyen para leer la configuración.
- `board.sh`: `list`, `move`, `size`, `body`, `attachments`, `update`, `comment`, `last-comment-is-bot`, `label`, `unlabel`. Los IDs del Project, de sus campos y opciones se resuelven por nombre en cada invocación.
- `worktree.sh`: `create`, `switch`, `run` (ejecuta un comando con el entorno del worktree), `check` (lint, typecheck y tests), `e2e` (mata servidores huérfanos, recrea la base e2e y corre la suite e2e como CI, con build de producción), `contracts` (contratos de la API), `schema` (migraciones), `migrate <nombre>` (crea una migración con la base del worktree), `remove`, `path`, `list`. Los comandos concretos de cada subcomando están en `flow.json`.
- `pr.sh`: `find`, `merged-sha`, `open`, `wait-ci`, `merge`, `wait-deploy <staging|production> <sha>`, `release-branch`.
- `release.sh`: `current` (versión en `origin/main`), `next` (propuesta +0.1), `notes <rama>` (bullets de la última versión en esa rama), `publish` (agrega la versión con sus Novedades al archivo de versiones, commitea y pushea en la rama indicada).

Los PRs de feature usan `Refs #n` y no `Closes #n`: el workflow built-in del proyecto movería el ticket a Done al mergear en `develop`. El PR de release sí usa `Closes #n`. Un PR que agrupa varios tickets los referencia en una sola línea `Refs` (`Refs #54 #55 #56`, `Refs #54, #55, #56` o `Refs #54, #55 y #56`); `pr.sh find` y `pr.sh merged-sha` encuentran ese PR para cada uno de los tickets.

## Configuración del flujo

Todo lo que identifica a este producto dentro del flujo vive en `.claude/flow.json`; las skills, los agentes y los scripts son el plugin `ticket-flow` y no nombran al producto, así el mismo flujo sirve para otro repo con solo instalar el plugin y escribir ese archivo. Este repo aporta `flow.json` (copiado de `templates/flow.json` del plugin y completado por `bootstrap.sh`), los permisos y el hook de `.claude/settings.json` y `CLAUDE.md`. `flow.sh check` valida que estén todas las claves. `doctor.sh` (o `/ticket-flow:doctor`, que además aplica los arreglos automáticos) verifica la configuración completa: repo, CLIs, GitHub (merge, protección de `main`, Project, labels, ambientes, secretos y variables por nombre), Postgres local, token de Turbo, Neon y Vercel (clave opcional `services` de `flow.json`), ambientes vivos y los MCPs de `.mcp.json` (Neon y Vercel); cada fallo sale con su `id`, qué falló, cómo verificarlo y cómo arreglarlo. Para instalar el plugin en un repo nuevo y el contrato que debe cumplir, ver el README del plugin.

| Clave                  | Qué es                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo`                 | `owner/repo` de GitHub.                                                                                                                                                                                                                                                                            |
| `project`              | `owner` y `number` del GitHub Project que hace de tablero (debe tener los campos `Status` con las cinco columnas y `Size` con XS–XL; `bootstrap.sh` lo crea).                                                                                                                                      |
| `branches`             | Nombres de las ramas `develop` y `main`.                                                                                                                                                                                                                                                           |
| `environments`         | `staging` y `production`, cada uno con el `workflow` de deploy (archivo en `.github/workflows`) y la `url` pública.                                                                                                                                                                                |
| `smokePaths`           | Rutas que `pr.sh wait-deploy` consulta tras el deploy para dar por vivo el ambiente.                                                                                                                                                                                                               |
| `worktrees.dir`        | Directorio de los worktrees, relativo a la raíz del repo.                                                                                                                                                                                                                                          |
| `worktrees.pgAdminUrl` | Conexión de administración a Postgres local para crear y borrar las bases de cada worktree (se puede pisar con la variable `PG_ADMIN_URL`).                                                                                                                                                        |
| `worktrees.dbPrefix`   | Prefijo de las bases `<prefijo>_test_<n>` y `<prefijo>_e2e_<n>`.                                                                                                                                                                                                                                   |
| `worktrees.ports`      | Variables de puerto que van a `.env.worktree` con su base; el valor es `base + (ticket % 500)`.                                                                                                                                                                                                    |
| `worktrees.commands`   | Comandos del stack que corren `worktree.sh` `create` (`install`), `check`, `e2e`, `contracts`, `schema` y `migrate` (recibe el nombre como argumento).                                                                                                                                             |
| `release`              | `file` (archivo de versiones y Novedades), `firstStage` y `firstNumber` (versión inicial cuando el archivo no existe en `main`).                                                                                                                                                                   |
| `product`              | `name`, `locale`, `audience` (quién usa el sistema), `qaUser` y `qaPassword` de staging, `qaUsers` (una cuenta por perfil, las que carga el seed), `routes` principales y `releaseNotesPlace` (dónde se ven las Novedades). Lo usan los agentes de refinamiento y de Novedades vía `flow.sh show`. |
