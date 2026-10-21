-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('NOVEDAD', 'AVISO');

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "notificarAvisosPorCorreo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificarNovedadesPorCorreo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notificacion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "novedadId" TEXT,
    "emailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificacion_emailId_key" ON "notificacion"("emailId");

-- CreateIndex
CREATE INDEX "notificacion_destinatarioId_createdAt_idx" ON "notificacion"("destinatarioId", "createdAt");

-- CreateIndex
CREATE INDEX "notificacion_novedadId_idx" ON "notificacion"("novedadId");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_novedadId_fkey" FOREIGN KEY ("novedadId") REFERENCES "novedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "email_outbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
