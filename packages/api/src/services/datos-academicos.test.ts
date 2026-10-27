import { prisma, toDateColumn } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { buscarComisiones, generarClases, listarMaterias } from "./datos-academicos";

const hoy = "2026-10-01";
let institution: TestOrganization;
let fixture: AcademicFixture;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  // Lunes 19:00–23:00 entre el 5 y el 30 de octubre de 2026: 4 lunes (5, 12, 19 y 26).
  fixture = await seedAcademicFixture(institution);
});

describe("generación de clases programadas", () => {
  it("crea una clase por horario y fecha del período, Programada y con el aula habitual", async () => {
    expect(await generarClases(authOf(institution, institution), {}, hoy)).toEqual({
      creadas: 4,
      existentes: 0,
      sinAula: 0,
    });
    const clases = await prisma.claseProgramada.findMany({ orderBy: { inicio: "asc" } });
    expect(clases.map((clase) => clase.inicio.toISOString())).toEqual([
      "2026-10-05T22:00:00.000Z",
      "2026-10-12T22:00:00.000Z",
      "2026-10-19T22:00:00.000Z",
      "2026-10-26T22:00:00.000Z",
    ]);
    expect(
      clases.every((clase) => clase.estado === "PROGRAMADA" && clase.aulaId === fixture.aulaId),
    ).toBe(true);
  });

  it("salta los días no laborables y no duplica las clases que ya existen", async () => {
    await prisma.diaNoLaborable.create({
      data: {
        organizationId: institution.organizationId,
        fecha: toDateColumn("2026-10-12"),
        motivo: "Feriado",
      },
    });
    const auth = authOf(institution, institution);
    expect(await generarClases(auth, { periodoLectivoId: fixture.periodoLectivoId }, hoy)).toEqual({
      creadas: 3,
      existentes: 0,
      sinAula: 0,
    });
    expect(await generarClases(auth, { comisionId: fixture.comisionId }, hoy)).toEqual({
      creadas: 0,
      existentes: 3,
      sinAula: 0,
    });
  });

  it("deja sin aula la clase cuyo aula habitual ya está ocupada en esa franja (CA-09)", async () => {
    const otraComision = await prisma.comision.create({
      data: {
        organizationId: institution.organizationId,
        materiaId: fixture.materiaId,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo: "5K1",
        turno: "NOCHE",
        anioLectivo: 2026,
        horarios: {
          create: {
            organizationId: institution.organizationId,
            diaSemana: 1,
            horaInicio: "21:00",
            horaFin: "23:00",
            aulaHabitualId: fixture.aulaId,
          },
        },
      },
    });
    const resumen = await generarClases(authOf(institution, institution), {}, hoy);
    expect(resumen).toEqual({ creadas: 8, existentes: 0, sinAula: 4 });
    const sinAula = await prisma.claseProgramada.findMany({
      where: { comisionId: otraComision.id },
    });
    expect(sinAula.every((clase) => clase.aulaId === null)).toBe(true);
  });

  it("solo Bedel y Autoridad generan clases; a los demás les niega el acceso y lo audita", async () => {
    const docente = await createUserWithPerfil(institution, "DOCENTE");
    await expect(generarClases(authOf(institution, docente), {})).rejects.toMatchObject({
      status: 403,
      message: "Acceso denegado",
    });
    expect(
      await prisma.auditLog.count({ where: { entity: "Permiso", action: "acceso_denegado" } }),
    ).toBe(1);
  });
});

describe("búsqueda de comisiones y materias", () => {
  it("combina carrera, año y materia, y trae docentes y carrera de cada comisión", async () => {
    const organizationId = institution.organizationId;
    const comisiones = await buscarComisiones(organizationId, {
      carreraId: fixture.carreraId,
      anio: 5,
    });
    expect(comisiones).toEqual([
      expect.objectContaining({
        id: fixture.comisionId,
        codigo: "5K2",
        materia: expect.objectContaining({ nombre: "Proyecto Final", anioCarrera: 5 }),
        carrera: expect.objectContaining({ codigo: "K" }),
        docentes: [{ id: fixture.docente.userId, nombre: fixture.docente.userName }],
      }),
    ]);
    expect(await buscarComisiones(organizationId, { anio: 4 })).toEqual([]);
    expect(await buscarComisiones(organizationId, { materiaId: "otra" })).toEqual([]);
    expect(await listarMaterias(organizationId, { carreraId: fixture.carreraId })).toEqual([
      expect.objectContaining({ id: fixture.materiaId, anioCarrera: 5 }),
    ]);
    expect(await listarMaterias(organizationId, { anio: 1 })).toEqual([]);
  });
});
