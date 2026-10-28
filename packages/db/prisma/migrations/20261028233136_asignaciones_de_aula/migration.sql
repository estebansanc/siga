-- CreateEnum
CREATE TYPE "OrigenAsignacionAula" AS ENUM ('GENERACION_CLASES', 'SOLICITUD_APROBADA', 'ASIGNACION_INMEDIATA', 'ASIGNACION_BEDELIA', 'CAMBIO_AULA');

-- CreateTable
CREATE TABLE "asignacion_aula" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "origen" "OrigenAsignacionAula" NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignacion_aula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asignacion_aula_organizationId_createdAt_idx" ON "asignacion_aula"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "asignacion_aula_organizationId_aulaId_createdAt_idx" ON "asignacion_aula"("organizationId", "aulaId", "createdAt");

-- CreateIndex
CREATE INDEX "asignacion_aula_claseId_idx" ON "asignacion_aula"("claseId");

-- AddForeignKey
ALTER TABLE "asignacion_aula" ADD CONSTRAINT "asignacion_aula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_aula" ADD CONSTRAINT "asignacion_aula_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clase_programada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_aula" ADD CONSTRAINT "asignacion_aula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_aula" ADD CONSTRAINT "asignacion_aula_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
