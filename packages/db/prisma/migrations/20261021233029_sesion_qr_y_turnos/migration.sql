-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN     "turnos" JSONB;

-- CreateTable
CREATE TABLE "sesion_qr" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "turno" "Turno" NOT NULL,
    "token" TEXT NOT NULL,
    "emitidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "bedelId" TEXT NOT NULL,

    CONSTRAINT "sesion_qr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sesion_qr_organizationId_emitidoEn_idx" ON "sesion_qr"("organizationId", "emitidoEn");

-- CreateIndex
CREATE INDEX "sesion_qr_aulaId_fecha_turno_idx" ON "sesion_qr"("aulaId", "fecha", "turno");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_qr_token_key" ON "sesion_qr"("token");

-- AddForeignKey
ALTER TABLE "sesion_qr" ADD CONSTRAINT "sesion_qr_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_qr" ADD CONSTRAINT "sesion_qr_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_qr" ADD CONSTRAINT "sesion_qr_bedelId_fkey" FOREIGN KEY ("bedelId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
