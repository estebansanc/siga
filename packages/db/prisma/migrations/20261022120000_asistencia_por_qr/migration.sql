-- CreateEnum
CREATE TYPE "ValidacionPresencia" AS ENUM ('UBICACION', 'RED');
-- AlterTable
ALTER TABLE "asistencia_docente" ADD COLUMN     "sesionQrId" TEXT,
ADD COLUMN     "validacion" "ValidacionPresencia";
-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN     "presencia" JSONB;
-- CreateTable
CREATE TABLE "intento_asistencia_fallido" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intento_asistencia_fallido_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "intento_asistencia_fallido_userId_createdAt_idx" ON "intento_asistencia_fallido"("userId", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "asistencia_docente_sesionQrId_docenteId_key" ON "asistencia_docente"("sesionQrId", "docenteId");
-- AddForeignKey
ALTER TABLE "asistencia_docente" ADD CONSTRAINT "asistencia_docente_sesionQrId_fkey" FOREIGN KEY ("sesionQrId") REFERENCES "sesion_qr"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "intento_asistencia_fallido" ADD CONSTRAINT "intento_asistencia_fallido_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "intento_asistencia_fallido" ADD CONSTRAINT "intento_asistencia_fallido_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
