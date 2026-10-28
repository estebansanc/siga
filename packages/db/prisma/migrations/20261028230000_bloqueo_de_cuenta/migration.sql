
-- CreateTable
CREATE TABLE "bloqueo_cuenta" (
    "userId" TEXT NOT NULL,
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),

    CONSTRAINT "bloqueo_cuenta_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "bloqueo_cuenta" ADD CONSTRAINT "bloqueo_cuenta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

