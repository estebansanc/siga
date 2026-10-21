import { createLocalAccountIssuer } from "@better-auth/core/db";
import {
  fechaArgentina,
  institutionName,
  institutionSlug,
  sumarDias,
  type Perfil,
} from "@repo/domain";
import { hashPassword } from "better-auth/crypto";

import { generarClasesProgramadas, toDateColumn } from "../src/clases-programadas";
import { prisma } from "../src/client";

// Seed de SiGA: la institución (CFG-2), un usuario por perfil, la carrera ISI con sus
// materias, comisiones, horarios y aulas, el período lectivo y las clases generadas.
// Es idempotente: `upsert` por ids fijos; el estado institucional, las novedades y las clases
// se recrean para que QA y los e2e arranquen siempre desde "Abierta" sin novedades.

const password = "demo1234";

const institution = { id: "utn-frt", name: institutionName, slug: institutionSlug };

type SeedUser = { id: string; name: string; email: string; perfil: Perfil; dni: string };

// demo@example.com es el usuario de QA de staging (`.claude/flow.json`).
const users: SeedUser[] = [
  {
    id: "demo-user",
    name: "Rosa Benítez",
    email: "demo@example.com",
    perfil: "BEDEL",
    dni: "22114560",
  },
  {
    id: "docente-1",
    name: "Marcos Álvarez",
    email: "docente@example.com",
    perfil: "DOCENTE",
    dni: "28456789",
  },
  {
    id: "docente-2",
    name: "Laura Giménez",
    email: "docente2@example.com",
    perfil: "DOCENTE",
    dni: "30221004",
  },
  {
    id: "docente-3",
    name: "Pablo Ruiz",
    email: "docente3@example.com",
    perfil: "DOCENTE",
    dni: "26778201",
  },
  {
    id: "docente-4",
    name: "Ana Torres",
    email: "docente4@example.com",
    perfil: "DOCENTE",
    dni: "31455690",
  },
  {
    id: "estudiante-1",
    name: "Lucía Gómez",
    email: "estudiante@example.com",
    perfil: "ESTUDIANTE",
    dni: "43880112",
  },
  {
    id: "autoridad-1",
    name: "Carla Medina",
    email: "autoridad@example.com",
    perfil: "AUTORIDAD",
    dni: "20998311",
  },
];

const aulas = [
  {
    id: "aula-12",
    codigo: "Aula 12",
    edificio: "Edificio A",
    piso: "1.º piso",
    capacidad: 60,
    equipamiento: ["Proyector", "Pizarra", "Climatizacion"],
  },
  {
    id: "aula-14",
    codigo: "Aula 14",
    edificio: "Edificio A",
    piso: "1.º piso",
    capacidad: 50,
    equipamiento: ["Proyector", "Pizarra"],
  },
  {
    id: "aula-7",
    codigo: "Aula 7",
    edificio: "Edificio B",
    piso: "PB",
    capacidad: 45,
    equipamiento: ["Proyector", "Pizarra", "Ventilacion"],
  },
  {
    id: "aula-3",
    codigo: "Aula 3",
    edificio: "Edificio B",
    piso: "PB",
    capacidad: 40,
    equipamiento: ["Pizarra"],
  },
  {
    id: "lab-3",
    codigo: "Laboratorio 3",
    edificio: "Edificio A",
    piso: "PB",
    capacidad: 30,
    equipamiento: ["Computadora", "Proyector", "Conectividad", "Climatizacion"],
  },
];

const carrera = { id: "carrera-isi", codigo: "K", nombre: "Ingeniería en Sistemas de Información" };

const materias = [
  { id: "materia-pf", codigo: "K5-PF", nombre: "Proyecto Final", anioCarrera: 5 },
  { id: "materia-ia", codigo: "K5-IA", nombre: "Inteligencia Artificial", anioCarrera: 5 },
  { id: "materia-sim", codigo: "K5-SIM", nombre: "Simulación", anioCarrera: 5 },
  { id: "materia-ag", codigo: "K5-AG", nombre: "Administración Gerencial", anioCarrera: 5 },
  { id: "materia-sg", codigo: "K4-SG", nombre: "Sistemas de Gestión", anioCarrera: 4 },
];

// El período va de 30 días atrás a 60 días adelante: así staging y los e2e siempre tienen
// clases de hoy, cualquiera sea la fecha en que se corra el seed.
const hoy = fechaArgentina(new Date());
const periodo = {
  id: "periodo-actual",
  nombre: `Período lectivo ${hoy.slice(0, 4)}`,
  fechaInicio: sumarDias(hoy, -30),
  fechaFin: sumarDias(hoy, 60),
};

const diasNoLaborables = [
  {
    id: "feriado-2026-10-12",
    fecha: "2026-10-12",
    motivo: "Día del Respeto a la Diversidad Cultural",
  },
  { id: "feriado-2026-11-20", fecha: "2026-11-20", motivo: "Día de la Soberanía Nacional" },
];

type SeedHorario = { diaSemana: number; horaInicio: string; horaFin: string; aulaId: string };
type SeedComision = {
  id: string;
  codigo: string;
  materiaId: string;
  docenteIds: string[];
  horarios: SeedHorario[];
};

// 5K2 tiene clase todos los días hábiles: así "Mis clases de hoy" siempre tiene datos.
const comisiones: SeedComision[] = [
  {
    id: "comision-5k2-pf",
    codigo: "5K2",
    materiaId: "materia-pf",
    docenteIds: ["docente-1"],
    horarios: [
      { diaSemana: 1, horaInicio: "19:00", horaFin: "23:00", aulaId: "aula-12" },
      { diaSemana: 4, horaInicio: "19:00", horaFin: "23:00", aulaId: "aula-12" },
    ],
  },
  {
    id: "comision-5k2-ia",
    codigo: "5K2",
    materiaId: "materia-ia",
    docenteIds: ["docente-2"],
    horarios: [
      { diaSemana: 2, horaInicio: "19:00", horaFin: "21:00", aulaId: "aula-7" },
      { diaSemana: 5, horaInicio: "19:00", horaFin: "21:00", aulaId: "aula-7" },
    ],
  },
  {
    id: "comision-5k2-sim",
    codigo: "5K2",
    materiaId: "materia-sim",
    docenteIds: ["docente-3"],
    horarios: [
      { diaSemana: 2, horaInicio: "21:00", horaFin: "23:00", aulaId: "aula-7" },
      { diaSemana: 3, horaInicio: "19:00", horaFin: "21:00", aulaId: "aula-7" },
    ],
  },
  {
    id: "comision-5k2-ag",
    codigo: "5K2",
    materiaId: "materia-ag",
    docenteIds: ["docente-4"],
    horarios: [
      { diaSemana: 3, horaInicio: "21:00", horaFin: "23:00", aulaId: "lab-3" },
      { diaSemana: 5, horaInicio: "21:00", horaFin: "23:00", aulaId: "lab-3" },
    ],
  },
  {
    id: "comision-5k1-pf",
    codigo: "5K1",
    materiaId: "materia-pf",
    docenteIds: ["docente-1"],
    horarios: [
      { diaSemana: 1, horaInicio: "19:00", horaFin: "23:00", aulaId: "aula-14" },
      { diaSemana: 4, horaInicio: "19:00", horaFin: "23:00", aulaId: "aula-14" },
    ],
  },
  {
    id: "comision-4k2-sg",
    codigo: "4K2",
    materiaId: "materia-sg",
    docenteIds: ["docente-1"],
    horarios: [
      { diaSemana: 2, horaInicio: "21:00", horaFin: "23:00", aulaId: "aula-3" },
      { diaSemana: 5, horaInicio: "21:00", horaFin: "23:00", aulaId: "aula-3" },
    ],
  },
];

const comisionesSeguidasPorEstudiante = [
  "comision-5k2-pf",
  "comision-5k2-ia",
  "comision-5k2-sim",
  "comision-5k2-ag",
];

const upsertInstitution = () =>
  prisma.organization.upsert({
    where: { id: institution.id },
    update: { name: institution.name, slug: institution.slug },
    create: { ...institution, createdAt: new Date() },
  });

const upsertUser = async (user: SeedUser) => {
  await prisma.user.upsert({
    where: { id: user.id },
    update: { name: user.name, email: user.email },
    create: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      accounts: {
        create: {
          id: `${user.id}-account`,
          accountId: user.id,
          providerId: "credential",
          issuer: createLocalAccountIssuer("credential"),
          password: await hashPassword(password),
        },
      },
    },
  });
  await prisma.member.upsert({
    where: { organizationId_userId: { organizationId: institution.id, userId: user.id } },
    update: {},
    create: {
      id: `${institution.id}-${user.id}`,
      organizationId: institution.id,
      userId: user.id,
      role: user.perfil === "BEDEL" ? "owner" : "member",
      createdAt: new Date(),
    },
  });
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { perfil: user.perfil, dni: user.dni, activo: true },
    create: { userId: user.id, organizationId: institution.id, perfil: user.perfil, dni: user.dni },
  });
};

const upsertAcademicData = async () => {
  for (const aula of aulas) {
    await prisma.aula.upsert({
      where: { id: aula.id },
      update: { ...aula, activa: true, estado: "DISPONIBLE" },
      create: { ...aula, organizationId: institution.id },
    });
  }
  await prisma.carrera.upsert({
    where: { id: carrera.id },
    update: { codigo: carrera.codigo, nombre: carrera.nombre, activa: true },
    create: { ...carrera, organizationId: institution.id },
  });
  for (const materia of materias) {
    await prisma.materia.upsert({
      where: { id: materia.id },
      update: { ...materia, activa: true },
      create: { ...materia, organizationId: institution.id, carreraId: carrera.id },
    });
  }
  await prisma.periodoLectivo.upsert({
    where: { id: periodo.id },
    update: {
      nombre: periodo.nombre,
      fechaInicio: toDateColumn(periodo.fechaInicio),
      fechaFin: toDateColumn(periodo.fechaFin),
    },
    create: {
      id: periodo.id,
      organizationId: institution.id,
      nombre: periodo.nombre,
      fechaInicio: toDateColumn(periodo.fechaInicio),
      fechaFin: toDateColumn(periodo.fechaFin),
    },
  });
  for (const dia of diasNoLaborables) {
    await prisma.diaNoLaborable.upsert({
      where: { id: dia.id },
      update: { motivo: dia.motivo },
      create: {
        id: dia.id,
        organizationId: institution.id,
        fecha: toDateColumn(dia.fecha),
        motivo: dia.motivo,
      },
    });
  }
  for (const comision of comisiones) {
    await prisma.comision.upsert({
      where: { id: comision.id },
      update: { codigo: comision.codigo, activa: true },
      create: {
        id: comision.id,
        organizationId: institution.id,
        materiaId: comision.materiaId,
        periodoLectivoId: periodo.id,
        codigo: comision.codigo,
        turno: "NOCHE",
        anioLectivo: Number(hoy.slice(0, 4)),
      },
    });
    await prisma.comisionDocente.deleteMany({ where: { comisionId: comision.id } });
    await prisma.comisionDocente.createMany({
      data: comision.docenteIds.map((docenteId) => ({ comisionId: comision.id, docenteId })),
    });
    await prisma.horario.deleteMany({ where: { comisionId: comision.id } });
    await prisma.horario.createMany({
      data: comision.horarios.map((horario, index) => ({
        id: `${comision.id}-h${index + 1}`,
        organizationId: institution.id,
        comisionId: comision.id,
        diaSemana: horario.diaSemana,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        aulaHabitualId: horario.aulaId,
      })),
    });
  }
};

const resetOperationalData = async () => {
  await prisma.novedad.deleteMany({ where: { organizationId: institution.id } });
  await prisma.claseProgramada.deleteMany({ where: { organizationId: institution.id } });
  await prisma.estadoInstitucional.deleteMany({ where: { organizationId: institution.id } });
  await prisma.estadoInstitucional.create({
    data: {
      organizationId: institution.id,
      estado: "ABIERTA",
      desde: new Date(),
      userId: "demo-user",
    },
  });
  await prisma.comisionSeguida.deleteMany({ where: { userId: "estudiante-1" } });
  await prisma.comisionSeguida.createMany({
    data: comisionesSeguidasPorEstudiante.map((comisionId) => ({
      userId: "estudiante-1",
      comisionId,
      organizationId: institution.id,
    })),
  });
};

const seed = async () => {
  await upsertInstitution();
  for (const user of users) await upsertUser(user);
  await upsertAcademicData();
  await resetOperationalData();
  const resumen = await generarClasesProgramadas(prisma, institution.id);
  console.log(
    `Seed listo: ${institution.name}. Clases generadas: ${resumen.creadas}. Usuarios (clave ${password}): ${users
      .map((user) => `${user.email} (${user.perfil})`)
      .join(", ")}`,
  );
};

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
