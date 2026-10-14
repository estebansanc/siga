# Producto

Documentación de SiGA a nivel producto: qué resuelve, para quién, requerimientos y especificaciones. Es la fuente de verdad de la que salen los tickets del tablero; los docs técnicos (`docs/*.md`) describen cómo está construido, no qué debe hacer.

Los documentos originales del proyecto (en Google Drive) mencionan tecnologías e implementación. Eso se descarta: el stack lo define este repo (`CLAUDE.md`, `docs/arquitectura.md`). De las fuentes se toman solo los requerimientos y definiciones de producto.

## Organización

| Archivo o carpeta           | Contenido                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vision.md`                 | Qué es SiGA, problema que resuelve, usuarios, alcance y fuera de alcance, principios, hitos, requisitos futuros.                                                     |
| `requerimientos.md`         | Catálogo de requisitos funcionales (RF-01 a RF-18) y no funcionales de producto, criterios de aceptación, matriz de permisos, entidades, estados de clase, glosario. |
| `especificaciones/`         | Un archivo por módulo con el detalle de flujos, reglas de negocio, estados y pantallas.                                                                              |
| `decisiones-de-producto.md` | Registro de decisiones de producto tomadas sobre puntos ambiguos de las fuentes, con fecha y dónde se reflejan.                                                      |
| `fuentes/`                  | Inventario de la documentación original (qué versión vale y qué aporta cada una) y copia de texto de la ERS v1.0.                                                    |

## Módulos

| Módulo                         | Especificación                                      | Requisitos                 |
| ------------------------------ | --------------------------------------------------- | -------------------------- |
| Usuarios y roles (transversal) | `especificaciones/usuarios-y-roles.md`              | RF-10, RF-11, RF-12, RF-13 |
| Novedades                      | `especificaciones/novedades.md`                     | RF-05, RF-07               |
| Aulas y espacios               | `especificaciones/aulas-y-espacios.md`              | RF-02, RF-06, RF-15, RF-16 |
| Actividad docente              | `especificaciones/actividad-docente.md`             | RF-03, RF-04, RF-18        |
| Avisos y estado institucional  | `especificaciones/avisos-y-estado-institucional.md` | RF-01, RF-08, RF-14, RF-17 |
| Histórico y consultas          | `especificaciones/historico-y-consultas.md`         | RF-09, RNF-03              |

## Convenciones

- Los identificadores `RF-NN`, `RNF-NN` y `CA-NN` son los de la Matriz de Trazabilidad y la ERS, y no cambian aunque cambie la prioridad.
- Cada especificación referencia los requisitos que cubre y cada ticket del tablero referencia la especificación y el requisito del que sale.
- Un cambio de decisión de producto se registra en `decisiones-de-producto.md` y se actualiza la especificación; un cambio de decisión técnica va en `docs/decisiones/`.
- Ante una diferencia entre documentos fuente, prevalece la ERS v1.0.
