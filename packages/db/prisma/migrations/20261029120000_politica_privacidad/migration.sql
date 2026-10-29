
-- CreateTable
CREATE TABLE "politica_privacidad" (
    "version" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "publicadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "politica_privacidad_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "aceptacion_politica" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "aceptadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aceptacion_politica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aceptacion_politica_userId_version_key" ON "aceptacion_politica"("userId", "version");

-- AddForeignKey
ALTER TABLE "aceptacion_politica" ADD CONSTRAINT "aceptacion_politica_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aceptacion_politica" ADD CONSTRAINT "aceptacion_politica_version_fkey" FOREIGN KEY ("version") REFERENCES "politica_privacidad"("version") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Versión 1 provisoria; la definitiva (decisión de producto 13) se publica como versión 2.
INSERT INTO "politica_privacidad" ("version", "titulo", "texto")
VALUES (
    1,
    'Política de privacidad',
    'Texto de ejemplo: esta no es la política definitiva

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.'
);
