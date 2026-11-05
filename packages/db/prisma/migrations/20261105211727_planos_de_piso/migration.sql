-- AlterTable
ALTER TABLE "aula" ADD COLUMN     "planoId" TEXT,
ADD COLUMN     "poligono" JSONB;

-- CreateTable
CREATE TABLE "plano_piso" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "edificio" TEXT NOT NULL,
    "piso" TEXT NOT NULL,
    "imagenKey" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_piso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plano_piso_organizationId_edificio_piso_key" ON "plano_piso"("organizationId", "edificio", "piso");

-- CreateIndex
CREATE INDEX "aula_planoId_idx" ON "aula"("planoId");

-- AddForeignKey
ALTER TABLE "aula" ADD CONSTRAINT "aula_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "plano_piso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_piso" ADD CONSTRAINT "plano_piso_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
