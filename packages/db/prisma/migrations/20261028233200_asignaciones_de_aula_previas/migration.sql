-- Reconstruye las asignaciones de aula previas a la tabla "asignacion_aula" desde los
-- horarios, las solicitudes, las novedades y la auditoría. Todo o nada: si una falla, ninguna
-- queda escrita y reintentar no duplica.
BEGIN;

-- Generación de clases: la clase nació con el aula habitual de su horario. Se descarta si el
-- aula habitual llegó después (solicitud Asignada, asignación de bedelía o aprobada sobre una
-- clase sin aula) y se incluye si la clase se movió luego (la novedad guarda el aula anterior).
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, c."organizationId", c."id", h."aulaHabitualId", 'GENERACION_CLASES', NULL, c."createdAt"
FROM "clase_programada" c
JOIN "horario" h ON h."id" = c."horarioId"
WHERE h."aulaHabitualId" IS NOT NULL
  AND (
    c."aulaId" = h."aulaHabitualId"
    OR EXISTS (
      SELECT 1 FROM "novedad_clase" nc
      WHERE nc."claseId" = c."id" AND nc."aulaAnteriorId" = h."aulaHabitualId"
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM "solicitud_aula" s
    WHERE s."claseId" = c."id" AND s."aulaId" = h."aulaHabitualId" AND s."estado" = 'ASIGNADA'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "solicitud_aula" s
    WHERE s."claseId" = c."id" AND s."aulaId" = h."aulaHabitualId" AND s."estado" = 'APROBADA'
      AND NOT EXISTS (SELECT 1 FROM "novedad_clase" nc WHERE nc."claseId" = c."id")
  )
  AND NOT EXISTS (
    SELECT 1 FROM "audit_log" a
    WHERE a."action" = 'aula_asignada'
      AND a."after"->>'claseId' = c."id"
      AND a."after"->>'aulaId' = h."aulaHabitualId"
  );

-- Solicitudes aprobadas por un bedel.
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, s."organizationId", s."claseId", s."aulaId", 'SOLICITUD_APROBADA', s."resueltaPorId", COALESCE(s."resueltaEn", s."updatedAt")
FROM "solicitud_aula" s
WHERE s."estado" = 'APROBADA';

-- Solicitudes que nacieron Asignadas.
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, s."organizationId", s."claseId", s."aulaId", 'ASIGNACION_INMEDIATA', s."solicitanteId", s."createdAt"
FROM "solicitud_aula" s
WHERE s."estado" = 'ASIGNADA';

-- Aulas asignadas por bedelía a clases sin aula (auditadas como "aula_asignada").
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, a."organizationId", c."id", u."id", 'ASIGNACION_BEDELIA', a."userId", a."createdAt"
FROM "audit_log" a
JOIN "clase_programada" c ON c."id" = a."after"->>'claseId'
JOIN "aula" u ON u."id" = a."after"->>'aulaId'
WHERE a."action" = 'aula_asignada';

-- Cambios de aula por novedad, salvo los que acompañaron una solicitud ya contada.
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, n."organizationId", nc."claseId", n."aulaNuevaId", 'CAMBIO_AULA', n."publicadaPorId", n."createdAt"
FROM "novedad" n
JOIN "novedad_clase" nc ON nc."novedadId" = n."id"
WHERE n."tipo" = 'CAMBIO_AULA'
  AND n."aulaNuevaId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "solicitud_aula" s
    WHERE s."claseId" = nc."claseId"
      AND s."aulaId" = n."aulaNuevaId"
      AND s."estado" IN ('APROBADA', 'ASIGNADA')
  );

-- Restituciones: al finalizar un Cambio de aula la clase volvió a su aula anterior.
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, n."organizationId", nc."claseId", nc."aulaAnteriorId", 'CAMBIO_AULA', n."finalizadaPorId", COALESCE(n."finalizadaEn", n."createdAt")
FROM "novedad" n
JOIN "novedad_clase" nc ON nc."novedadId" = n."id"
JOIN "clase_programada" c ON c."id" = nc."claseId"
WHERE n."tipo" = 'CAMBIO_AULA'
  AND n."estado" = 'FINALIZADA'
  AND nc."aulaAnteriorId" IS NOT NULL
  AND c."aulaId" = nc."aulaAnteriorId";

COMMIT;
