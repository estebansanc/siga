-- AlterTable
ALTER TABLE "aviso" ADD COLUMN     "finalizadoEn" TIMESTAMP(3),
ADD COLUMN     "finalizadoPorId" TEXT;

-- CreateTable
CREATE TABLE "clase_suspendida_por_cierre" (
    "id" TEXT NOT NULL,
    "cierreId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "estadoAnterior" "EstadoClase" NOT NULL,

    CONSTRAINT "clase_suspendida_por_cierre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clase_suspendida_por_cierre_claseId_idx" ON "clase_suspendida_por_cierre"("claseId");

-- CreateIndex
CREATE UNIQUE INDEX "clase_suspendida_por_cierre_cierreId_claseId_key" ON "clase_suspendida_por_cierre"("cierreId", "claseId");

-- AddForeignKey
ALTER TABLE "clase_suspendida_por_cierre" ADD CONSTRAINT "clase_suspendida_por_cierre_cierreId_fkey" FOREIGN KEY ("cierreId") REFERENCES "estado_institucional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clase_suspendida_por_cierre" ADD CONSTRAINT "clase_suspendida_por_cierre_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clase_programada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aviso" ADD CONSTRAINT "aviso_finalizadoPorId_fkey" FOREIGN KEY ("finalizadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
