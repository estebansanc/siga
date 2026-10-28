import { fechaArgentina, instanteArgentino } from "@repo/domain";

const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/app_e2e";

// El cliente de Prisma lee `DATABASE_URL` al importarse: se apunta a la base e2e antes.
const abrirBase = async () => {
  process.env.DATABASE_URL = e2eDatabaseUrl;
  const { prisma, toDateColumn } = await import("@repo/db");
  return { prisma, toDateColumn };
};

// Una aula nueva y una clase de hoy de 5K2 Proyecto Final (docente@example.com) en ella, para
// que el escenario no dependa del día de la semana en que corre el seed.
export const crearClaseDeHoyConAula = async () => {
  const { prisma, toDateColumn } = await abrirBase();
  const comision = await prisma.comision.findUniqueOrThrow({ where: { id: "comision-5k2-pf" } });
  const hoy = fechaArgentina(new Date());
  const minuto = 10 + Math.floor(Math.random() * 40);
  const aula = await prisma.aula.create({
    data: {
      organizationId: comision.organizationId,
      codigo: `Aula Doc ${Date.now().toString(36)}`,
      edificio: "Edificio C",
      piso: "PB",
      capacidad: 30,
    },
  });
  const clase = await prisma.claseProgramada.create({
    data: {
      organizationId: comision.organizationId,
      comisionId: comision.id,
      fecha: toDateColumn(hoy),
      inicio: instanteArgentino(hoy, `00:${minuto}`),
      fin: instanteArgentino(hoy, `01:${minuto}`),
      aulaId: aula.id,
    },
  });
  return { aulaId: aula.id, aulaCodigo: aula.codigo, claseId: clase.id };
};

export const incidenciasDelAula = async (aulaId: string) => {
  const { prisma } = await abrirBase();
  return prisma.incidencia.findMany({
    where: { aulaId },
    include: { reportadaPor: { select: { email: true } } },
  });
};

export const eliminarClaseConAula = async (claseId: string, aulaId: string) => {
  const { prisma } = await abrirBase();
  await prisma.claseProgramada.delete({ where: { id: claseId } });
  await prisma.aula.delete({ where: { id: aulaId } });
};

// Un aula nueva en un edificio propio con una clase de 5K2 Proyecto Final que ya empezó y
// sigue en curso, para que el plano no dependa de la hora en que corre el seed.
export const crearAulaConClaseEnCurso = async () => {
  const { prisma, toDateColumn } = await abrirBase();
  const comision = await prisma.comision.findUniqueOrThrow({ where: { id: "comision-5k2-pf" } });
  const marca = Date.now().toString(36);
  const inicio = new Date(Date.now() - (5 + Math.floor(Math.random() * 40)) * 60_000);
  const aula = await prisma.aula.create({
    data: {
      organizationId: comision.organizationId,
      codigo: `Aula Plano ${marca}`,
      edificio: `Plano ${marca}`,
      piso: "PB",
      capacidad: 30,
    },
  });
  const clase = await prisma.claseProgramada.create({
    data: {
      organizationId: comision.organizationId,
      comisionId: comision.id,
      fecha: toDateColumn(fechaArgentina(inicio)),
      inicio,
      fin: new Date(inicio.getTime() + 120 * 60_000),
      aulaId: aula.id,
    },
  });
  return { aulaId: aula.id, aulaCodigo: aula.codigo, edificio: aula.edificio, claseId: clase.id };
};

export const registrarDocentePresente = async (claseId: string) => {
  const { prisma } = await abrirBase();
  await prisma.claseProgramada.update({
    where: { id: claseId },
    data: { estado: "DOCENTE_PRESENTE" },
  });
};

export const ponerAulaEnMantenimiento = async (aulaId: string) => {
  const { prisma } = await abrirBase();
  await prisma.aula.update({ where: { id: aulaId }, data: { estado: "EN_MANTENIMIENTO" } });
};
