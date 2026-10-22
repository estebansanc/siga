-- AlterTable
ALTER TABLE "solicitud_aula" ADD COLUMN     "resueltaEn" TIMESTAMP(3),
ADD COLUMN     "resueltaPorId" TEXT;

-- CreateIndex
CREATE INDEX "solicitud_aula_organizationId_estado_createdAt_idx" ON "solicitud_aula"("organizationId", "estado", "createdAt");

-- AddForeignKey
ALTER TABLE "solicitud_aula" ADD CONSTRAINT "solicitud_aula_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
