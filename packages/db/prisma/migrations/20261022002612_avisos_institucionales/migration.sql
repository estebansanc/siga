-- CreateEnum
CREATE TYPE "PrioridadAviso" AS ENUM ('NORMAL', 'URGENTE');

-- AlterTable
ALTER TABLE "notificacion" ADD COLUMN     "avisoId" TEXT;

-- CreateTable
CREATE TABLE "aviso" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "prioridad" "PrioridadAviso" NOT NULL DEFAULT 'NORMAL',
    "todos" BOOLEAN NOT NULL,
    "perfiles" "Perfil"[],
    "carreraIds" TEXT[],
    "anios" INTEGER[],
    "comisionIds" TEXT[],
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "enviarPorCorreo" BOOLEAN NOT NULL DEFAULT false,
    "publicadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aviso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aviso_organizationId_hasta_idx" ON "aviso"("organizationId", "hasta");

-- CreateIndex
CREATE INDEX "aviso_organizationId_createdAt_idx" ON "aviso"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "notificacion_avisoId_idx" ON "notificacion"("avisoId");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "aviso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aviso" ADD CONSTRAINT "aviso_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aviso" ADD CONSTRAINT "aviso_publicadoPorId_fkey" FOREIGN KEY ("publicadoPorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
