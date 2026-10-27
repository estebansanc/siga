-- AlterTable
ALTER TABLE "dia_no_laborable" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "horario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "periodo_lectivo" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
