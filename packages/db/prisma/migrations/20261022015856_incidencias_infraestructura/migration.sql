-- CreateEnum
CREATE TYPE "ElementoIncidencia" AS ENUM ('PROYECTOR', 'CLIMATIZACION', 'ILUMINACION', 'MOBILIARIO', 'CONECTIVIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "GravedadIncidencia" AS ENUM ('LEVE', 'IMPIDE_USO');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ABIERTA', 'EN_CURSO', 'RESUELTA');

-- CreateTable
CREATE TABLE "incidencia" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "elemento" "ElementoIncidencia" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "gravedad" "GravedadIncidencia" NOT NULL,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
    "fotoKey" TEXT,
    "reportadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia_estado" (
    "id" TEXT NOT NULL,
    "incidenciaId" TEXT NOT NULL,
    "estado" "EstadoIncidencia" NOT NULL,
    "observaciones" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencia_estado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidencia_organizationId_estado_createdAt_idx" ON "incidencia"("organizationId", "estado", "createdAt");

-- CreateIndex
CREATE INDEX "incidencia_aulaId_createdAt_idx" ON "incidencia"("aulaId", "createdAt");

-- CreateIndex
CREATE INDEX "incidencia_estado_incidenciaId_createdAt_idx" ON "incidencia_estado"("incidenciaId", "createdAt");

-- CreateIndex
CREATE INDEX "incidencia_estado_userId_idx" ON "incidencia_estado"("userId");

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_reportadaPorId_fkey" FOREIGN KEY ("reportadaPorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_estado" ADD CONSTRAINT "incidencia_estado_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "incidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_estado" ADD CONSTRAINT "incidencia_estado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
