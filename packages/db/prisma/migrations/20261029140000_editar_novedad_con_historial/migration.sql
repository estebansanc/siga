-- CreateTable
CREATE TABLE "novedad_edicion" (
    "id" TEXT NOT NULL,
    "novedadId" TEXT NOT NULL,
    "editadaPorId" TEXT NOT NULL,
    "editadaPorBedelia" BOOLEAN NOT NULL DEFAULT false,
    "minutosDemora" INTEGER,
    "enlaceVirtual" TEXT,
    "aulaNuevaId" TEXT,
    "mensaje" TEXT,
    "minutosDemoraPrevios" INTEGER,
    "enlaceVirtualPrevio" TEXT,
    "aulaPreviaId" TEXT,
    "mensajePrevio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novedad_edicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "novedad_edicion_novedadId_createdAt_idx" ON "novedad_edicion"("novedadId", "createdAt");

-- AddForeignKey
ALTER TABLE "novedad_edicion" ADD CONSTRAINT "novedad_edicion_novedadId_fkey" FOREIGN KEY ("novedadId") REFERENCES "novedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_edicion" ADD CONSTRAINT "novedad_edicion_editadaPorId_fkey" FOREIGN KEY ("editadaPorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_edicion" ADD CONSTRAINT "novedad_edicion_aulaNuevaId_fkey" FOREIGN KEY ("aulaNuevaId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_edicion" ADD CONSTRAINT "novedad_edicion_aulaPreviaId_fkey" FOREIGN KEY ("aulaPreviaId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

