-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'BEDEL', 'AUTORIDAD');

-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('MANANA', 'TARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "EstadoAula" AS ENUM ('DISPONIBLE', 'FUERA_DE_SERVICIO', 'EN_MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "EstadoClase" AS ENUM ('PROGRAMADA', 'DEMORADA', 'DOCENTE_PRESENTE', 'VIRTUAL', 'AUSENTE', 'SUSPENDIDA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('PRESENCIAL', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "TipoNovedad" AS ENUM ('AUSENCIA', 'DEMORA', 'VIRTUAL', 'SUSPENSION', 'CAMBIO_AULA');

-- CreateEnum
CREATE TYPE "EstadoNovedad" AS ENUM ('ACTIVA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "EstadoInstitucion" AS ENUM ('ABIERTA', 'CERRADA', 'ABIERTA_CON_NOVEDADES');

-- CreateTable
CREATE TABLE "user_profile" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "dni" TEXT,
    "legajo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "carrera" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "carrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materia" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "carreraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "anioCarrera" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo_lectivo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,

    CONSTRAINT "periodo_lectivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "periodoLectivoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "turno" "Turno" NOT NULL,
    "anioLectivo" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision_docente" (
    "comisionId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,

    CONSTRAINT "comision_docente_pkey" PRIMARY KEY ("comisionId","docenteId")
);

-- CreateTable
CREATE TABLE "horario" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "aulaHabitualId" TEXT,

    CONSTRAINT "horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dia_no_laborable" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "dia_no_laborable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "edificio" TEXT NOT NULL,
    "piso" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "equipamiento" TEXT[],
    "estado" "EstadoAula" NOT NULL DEFAULT 'DISPONIBLE',
    "observaciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clase_programada" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "horarioId" TEXT,
    "fecha" DATE NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "aulaId" TEXT,
    "modalidad" "Modalidad" NOT NULL DEFAULT 'PRESENCIAL',
    "estado" "EstadoClase" NOT NULL DEFAULT 'PROGRAMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clase_programada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_institucional" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estado" "EstadoInstitucion" NOT NULL,
    "motivo" TEXT,
    "desde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estado_institucional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedad" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "minutosDemora" INTEGER,
    "enlaceVirtual" TEXT,
    "aulaNuevaId" TEXT,
    "mensaje" TEXT,
    "estado" "EstadoNovedad" NOT NULL DEFAULT 'ACTIVA',
    "publicadaPorId" TEXT NOT NULL,
    "publicadaPorBedelia" BOOLEAN NOT NULL DEFAULT false,
    "finalizadaEn" TIMESTAMP(3),
    "finalizadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedad_clase" (
    "novedadId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "aulaAnteriorId" TEXT,

    CONSTRAINT "novedad_clase_pkey" PRIMARY KEY ("novedadId","claseId")
);

-- CreateTable
CREATE TABLE "comision_seguida" (
    "userId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comision_seguida_pkey" PRIMARY KEY ("userId","comisionId")
);

-- CreateIndex
CREATE INDEX "user_profile_organizationId_perfil_idx" ON "user_profile"("organizationId", "perfil");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_organizationId_dni_key" ON "user_profile"("organizationId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "carrera_organizationId_codigo_key" ON "carrera"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "materia_carreraId_anioCarrera_idx" ON "materia"("carreraId", "anioCarrera");

-- CreateIndex
CREATE UNIQUE INDEX "materia_organizationId_codigo_key" ON "materia"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "periodo_lectivo_organizationId_idx" ON "periodo_lectivo"("organizationId");

-- CreateIndex
CREATE INDEX "comision_organizationId_idx" ON "comision"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "comision_materiaId_codigo_key" ON "comision"("materiaId", "codigo");

-- CreateIndex
CREATE INDEX "comision_docente_docenteId_idx" ON "comision_docente"("docenteId");

-- CreateIndex
CREATE INDEX "horario_comisionId_idx" ON "horario"("comisionId");

-- CreateIndex
CREATE UNIQUE INDEX "dia_no_laborable_organizationId_fecha_key" ON "dia_no_laborable"("organizationId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "aula_organizationId_codigo_key" ON "aula"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "clase_programada_organizationId_fecha_idx" ON "clase_programada"("organizationId", "fecha");

-- CreateIndex
CREATE INDEX "clase_programada_aulaId_inicio_idx" ON "clase_programada"("aulaId", "inicio");

-- CreateIndex
CREATE INDEX "clase_programada_organizationId_estado_fin_idx" ON "clase_programada"("organizationId", "estado", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "clase_programada_comisionId_inicio_key" ON "clase_programada"("comisionId", "inicio");

-- CreateIndex
CREATE INDEX "estado_institucional_organizationId_desde_idx" ON "estado_institucional"("organizationId", "desde");

-- CreateIndex
CREATE INDEX "novedad_organizationId_createdAt_idx" ON "novedad"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "novedad_comisionId_estado_idx" ON "novedad"("comisionId", "estado");

-- CreateIndex
CREATE INDEX "novedad_publicadaPorId_idx" ON "novedad"("publicadaPorId");

-- CreateIndex
CREATE INDEX "novedad_clase_claseId_idx" ON "novedad_clase"("claseId");

-- CreateIndex
CREATE INDEX "comision_seguida_comisionId_idx" ON "comision_seguida"("comisionId");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrera" ADD CONSTRAINT "carrera_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materia" ADD CONSTRAINT "materia_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materia" ADD CONSTRAINT "materia_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodo_lectivo" ADD CONSTRAINT "periodo_lectivo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision" ADD CONSTRAINT "comision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision" ADD CONSTRAINT "comision_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision" ADD CONSTRAINT "comision_periodoLectivoId_fkey" FOREIGN KEY ("periodoLectivoId") REFERENCES "periodo_lectivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_docente" ADD CONSTRAINT "comision_docente_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_docente" ADD CONSTRAINT "comision_docente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario" ADD CONSTRAINT "horario_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario" ADD CONSTRAINT "horario_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario" ADD CONSTRAINT "horario_aulaHabitualId_fkey" FOREIGN KEY ("aulaHabitualId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dia_no_laborable" ADD CONSTRAINT "dia_no_laborable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aula" ADD CONSTRAINT "aula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clase_programada" ADD CONSTRAINT "clase_programada_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clase_programada" ADD CONSTRAINT "clase_programada_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clase_programada" ADD CONSTRAINT "clase_programada_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "horario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clase_programada" ADD CONSTRAINT "clase_programada_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_institucional" ADD CONSTRAINT "estado_institucional_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_institucional" ADD CONSTRAINT "estado_institucional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_aulaNuevaId_fkey" FOREIGN KEY ("aulaNuevaId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_publicadaPorId_fkey" FOREIGN KEY ("publicadaPorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_finalizadaPorId_fkey" FOREIGN KEY ("finalizadaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_clase" ADD CONSTRAINT "novedad_clase_novedadId_fkey" FOREIGN KEY ("novedadId") REFERENCES "novedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_clase" ADD CONSTRAINT "novedad_clase_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clase_programada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad_clase" ADD CONSTRAINT "novedad_clase_aulaAnteriorId_fkey" FOREIGN KEY ("aulaAnteriorId") REFERENCES "aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_seguida" ADD CONSTRAINT "comision_seguida_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_seguida" ADD CONSTRAINT "comision_seguida_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comision_seguida" ADD CONSTRAINT "comision_seguida_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
