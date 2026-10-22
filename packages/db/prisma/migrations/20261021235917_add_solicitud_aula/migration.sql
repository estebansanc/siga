-- CreateEnum
CREATE TYPE "EstadoSolicitudAula" AS ENUM ('PENDIENTE', 'ASIGNADA', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "solicitud_aula" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "alumnos" INTEGER NOT NULL,
    "recursos" TEXT[],
    "comentario" TEXT,
    "estado" "EstadoSolicitudAula" NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_aula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitud_aula_organizationId_solicitanteId_createdAt_idx" ON "solicitud_aula"("organizationId", "solicitanteId", "createdAt");

-- CreateIndex
CREATE INDEX "solicitud_aula_claseId_estado_idx" ON "solicitud_aula"("claseId", "estado");

-- AddForeignKey
ALTER TABLE "solicitud_aula" ADD CONSTRAINT "solicitud_aula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_aula" ADD CONSTRAINT "solicitud_aula_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_aula" ADD CONSTRAINT "solicitud_aula_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clase_programada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_aula" ADD CONSTRAINT "solicitud_aula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
