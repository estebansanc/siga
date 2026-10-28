-- Reconstruye las asignaciones de aula previas a la tabla "asignacion_aula" desde los
-- horarios, las solicitudes, las novedades y la auditoría.

-- Generación de clases: la clase conserva el aula habitual de su horario.
INSERT INTO "asignacion_aula" ("id", "organizationId", "claseId", "aulaId", "origen", "usuarioId", "createdAt")
SELECT gen_random_uuid()::text, c."organizationId", c."id", c."aulaId", 'GENERACION_CLASES', NULL, c."createdAt"
FROM "clase_programada" c
JOIN "horario" h ON h."id" = c."horarioId"
WHERE c."aulaId" IS NOT NULL AND h."aulaHabitualId" = c."aulaId";

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
