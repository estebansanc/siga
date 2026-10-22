-- CreateEnum
CREATE TYPE "MetodoAsistencia" AS ENUM ('QR', 'MANUAL');

-- CreateTable
CREATE TABLE "asistencia_docente" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "metodo" "MetodoAsistencia" NOT NULL,
    "horaLlegada" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "registradaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencia_docente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asistencia_docente_claseId_key" ON "asistencia_docente"("claseId");

-- CreateIndex
CREATE INDEX "asistencia_docente_organizationId_createdAt_idx" ON "asistencia_docente"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "asistencia_docente" ADD CONSTRAINT "asistencia_docente_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia_docente" ADD CONSTRAINT "asistencia_docente_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clase_programada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia_docente" ADD CONSTRAINT "asistencia_docente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia_docente" ADD CONSTRAINT "asistencia_docente_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
