-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN     "dominiosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- RF-10: el autorregistro exige verificar el correo; las cuentas que ya existen se consideran verificadas.
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;
