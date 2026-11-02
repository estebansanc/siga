import { fechaArgentina, instanteArgentino, sumarDias } from "@repo/domain";

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
// Con `inicio` la clase dura dos horas desde ese instante (en curso, futura o ya vencida).
export const crearClaseDeHoyConAula = async (inicioClase?: Date) => {
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
      inicio: inicioClase ?? instanteArgentino(hoy, `00:${minuto}`),
      fin: inicioClase
        ? new Date(inicioClase.getTime() + 120 * 60_000)
        : instanteArgentino(hoy, `01:${minuto}`),
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

export const limpiarNovedades = async (claseId: string) => {
  const { prisma } = await abrirBase();
  await prisma.novedad.deleteMany({ where: { clases: { some: { claseId } } } });
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

// Una aula nueva y una clase de 5K2 Proyecto Final sin aula en dos días, para asignarla desde
// Solicitudes sin depender de los datos del seed.
export const crearClaseSinAulaProxima = async () => {
  const { prisma, toDateColumn } = await abrirBase();
  const comision = await prisma.comision.findUniqueOrThrow({ where: { id: "comision-5k2-pf" } });
  const fecha = sumarDias(fechaArgentina(new Date()), 2);
  const minuto = 10 + Math.floor(Math.random() * 40);
  const aula = await prisma.aula.create({
    data: {
      organizationId: comision.organizationId,
      codigo: `Aula Uso ${Date.now().toString(36)}`,
      edificio: "Edificio D",
      piso: "PB",
      capacidad: 30,
    },
  });
  const clase = await prisma.claseProgramada.create({
    data: {
      organizationId: comision.organizationId,
      comisionId: comision.id,
      fecha: toDateColumn(fecha),
      inicio: instanteArgentino(fecha, `05:${minuto}`),
      fin: instanteArgentino(fecha, `06:${minuto}`),
      aulaId: null,
    },
  });
  return { aulaId: aula.id, aulaCodigo: aula.codigo, claseId: clase.id, fecha };
};

export const eliminarClaseSinAula = async (claseId: string, aulaId: string) => {
  const { prisma } = await abrirBase();
  await prisma.claseProgramada.delete({ where: { id: claseId } });
  await prisma.aula.delete({ where: { id: aulaId } });
};

const comienzoDelDia = (fecha: string) => instanteArgentino(fecha, "00:00").getTime();

// Un edificio propio con tres aulas: una con una clase de 5K2 en curso, una libre y una de
// destino en otro piso, más una clase de 5K2 de hoy sin aula, también en curso. Sirve para
// asignar, mover y reemplazar desde el plano sin depender del seed.
export const crearEscenarioDeAsignacion = async () => {
  const { prisma, toDateColumn } = await abrirBase();
  const comision = await prisma.comision.findUniqueOrThrow({ where: { id: "comision-5k2-pf" } });
  const marca = Date.now().toString(36);
  const edificio = `Asignar ${marca}`;
  const crearAula = (codigo: string, piso: string) =>
    prisma.aula.create({
      data: { organizationId: comision.organizationId, codigo, edificio, piso, capacidad: 60 },
    });
  const [conClase, libre, destino] = await Promise.all([
    crearAula(`Aula Ocupada ${marca}`, "PB"),
    crearAula(`Aula Libre ${marca}`, "PB"),
    crearAula(`Aula Destino ${marca}`, "1.º piso"),
  ]);
  // Pasada la medianoche "hace 40 minutos" cae ayer: la clase sin aula debe ser de hoy, y las
  // dos clases no pueden compartir inicio (único por comisión).
  const hoy = fechaArgentina(new Date());
  const crearClase = (inicio: Date, aulaId: string | null) =>
    prisma.claseProgramada.create({
      data: {
        organizationId: comision.organizationId,
        comisionId: comision.id,
        fecha: toDateColumn(fechaArgentina(inicio)),
        inicio,
        fin: new Date(Date.now() + 90 * 60_000),
        aulaId,
      },
    });
  const haceMinutos = (minutos: number) => new Date(Date.now() - minutos * 60_000);
  const enCurso = await crearClase(haceMinutos(10 + Math.floor(Math.random() * 20)), conClase.id);
  const sinAula = await crearClase(
    new Date(
      Math.max(
        haceMinutos(31 + Math.floor(Math.random() * 20)).getTime(),
        comienzoDelDia(hoy) + 60_000,
      ),
    ),
    null,
  );
  return {
    edificio,
    conClase,
    libre,
    destino,
    claseEnCursoId: enCurso.id,
    claseSinAulaId: sinAula.id,
    desde: new Date(),
  };
};

export const eliminarEscenarioDeAsignacion = async (
  escenario: Awaited<ReturnType<typeof crearEscenarioDeAsignacion>>,
) => {
  const { prisma } = await abrirBase();
  await prisma.claseProgramada.deleteMany({
    where: { id: { in: [escenario.claseEnCursoId, escenario.claseSinAulaId] } },
  });
  await prisma.aula.deleteMany({
    where: { id: { in: [escenario.conClase.id, escenario.libre.id, escenario.destino.id] } },
  });
  await prisma.novedad.deleteMany({ where: { clases: { none: {} } } });
  await prisma.emailOutbox.deleteMany({
    where: {
      createdAt: { gte: escenario.desde },
      OR: [
        { subject: { startsWith: "Aula asignada" } },
        { subject: { startsWith: "Cambio de aula" } },
      ],
    },
  });
};

// Novedades para las pestañas Activas / Historial: una activa y una finalizada de 5K2 Proyecto
// Final (del docente), dos de una comisión ajena y 21 finalizadas sueltas para cortar en dos
// páginas. Todas llevan la marca en el mensaje.
export const crearNovedadesDeHistorial = async () => {
  const { prisma, toDateColumn } = await abrirBase();
  const marca = Date.now().toString(36);
  const comision = await prisma.comision.findUniqueOrThrow({ where: { id: "comision-5k2-pf" } });
  const ajena = await prisma.comision.findFirstOrThrow({
    where: {
      organizationId: comision.organizationId,
      docentes: { none: { docente: { email: "docente@example.com" } } },
    },
  });
  const docente = await prisma.user.findUniqueOrThrow({ where: { email: "docente@example.com" } });
  const bedel = await prisma.user.findUniqueOrThrow({ where: { email: "demo@example.com" } });
  const fecha = sumarDias(fechaArgentina(new Date()), 3);

  const nueva = async (
    comisionId: string,
    publicadaPorId: string,
    mensaje: string,
    estado: "ACTIVA" | "FINALIZADA",
    conClase = true,
  ) => {
    const inicio = new Date(
      instanteArgentino(fecha, "03:00").getTime() + Math.floor(Math.random() * 7200) * 1000,
    );
    const clase = conClase
      ? await prisma.claseProgramada.create({
          data: {
            organizationId: comision.organizationId,
            comisionId,
            fecha: toDateColumn(fecha),
            inicio,
            fin: new Date(inicio.getTime() + 3_600_000),
          },
        })
      : null;
    return prisma.novedad.create({
      data: {
        organizationId: comision.organizationId,
        comisionId,
        tipo: "DEMORA",
        minutosDemora: 10,
        mensaje: `${mensaje} ${marca}`,
        estado,
        finalizadaEn: estado === "FINALIZADA" ? new Date() : null,
        publicadaPorId,
        clases: clase ? { create: { claseId: clase.id } } : undefined,
      },
    });
  };

  for (let numero = 1; numero <= 21; numero++) {
    await nueva(comision.id, docente.id, `Masiva ${numero}`, "FINALIZADA", false);
  }
  await nueva(comision.id, docente.id, "Finalizada propia", "FINALIZADA");
  await nueva(ajena.id, bedel.id, "Finalizada ajena", "FINALIZADA");
  await nueva(ajena.id, bedel.id, "Activa ajena", "ACTIVA");
  await nueva(comision.id, docente.id, "Activa propia", "ACTIVA");

  const limpiar = async () => {
    const novedades = await prisma.novedad.findMany({
      where: { mensaje: { endsWith: marca } },
      select: { id: true, clases: { select: { claseId: true } } },
    });
    await prisma.novedad.deleteMany({ where: { id: { in: novedades.map(({ id }) => id) } } });
    await prisma.claseProgramada.deleteMany({
      where: {
        id: { in: novedades.flatMap(({ clases }) => clases.map(({ claseId }) => claseId)) },
      },
    });
  };
  return { marca, limpiar };
};
