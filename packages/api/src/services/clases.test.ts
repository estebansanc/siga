import { prisma } from "@repo/db";
import { fechaArgentina, sumarDias, type ListarClasesQuery } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createClase,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { finalizarClasesVencidas, listarClases, obtenerClase } from "./clases";

let institution: TestOrganization;
let fixture: AcademicFixture;
let estudiante: TestUser;
const hoy = () => fechaArgentina(new Date());

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
});

describe("mis clases de hoy", () => {
  it("el estudiante ve hoy solo sus comisiones seguidas; sin seguir ninguna, nada", async () => {
    const clase = await createClase(institution, fixture, hoy(), "00:00", "23:59");
    await createClase(institution, fixture, sumarDias(hoy(), 1));
    const auth = authOf(institution, estudiante);
    expect((await listarClases(auth, { ambito: "mias" })).clases).toEqual([]);

    await prisma.comisionSeguida.create({
      data: {
        userId: estudiante.userId,
        comisionId: fixture.comisionId,
        organizationId: institution.organizationId,
      },
    });
    const { fecha, clases } = await listarClases(auth, { ambito: "mias" });
    expect(fecha).toBe(hoy());
    expect(clases).toEqual([
      expect.objectContaining({
        id: clase.id,
        horaInicio: "00:00",
        horaFin: "23:59",
        estado: "PROGRAMADA",
        comision: expect.objectContaining({ codigo: "5K2" }),
        materia: expect.objectContaining({ nombre: "Proyecto Final" }),
        aula: expect.objectContaining({ codigo: "Aula 12", edificio: "Edificio A" }),
        docentes: [{ id: fixture.docente.userId, nombre: fixture.docente.userName }],
        novedades: [],
      }),
    ]);
  });

  it("el docente ve las clases que dicta; bedel y autoridad ven todas; 'todas' abre el ámbito", async () => {
    const clase = await createClase(institution, fixture, hoy(), "00:00", "23:59");
    const otroDocente = await createUserWithPerfil(institution, "DOCENTE");
    const ids = async (auth: ReturnType<typeof authOf>, ambito: "mias" | "todas" = "mias") =>
      (await listarClases(auth, { ambito })).clases.map((item) => item.id);

    expect(await ids(authOf(institution, fixture.docente))).toEqual([clase.id]);
    expect(await ids(authOf(institution, otroDocente))).toEqual([]);
    expect(await ids(authOf(institution, otroDocente), "todas")).toEqual([clase.id]);
    expect(await ids(authOf(institution, institution))).toEqual([clase.id]);
    expect(await ids(authOf(institution, estudiante), "todas")).toEqual([clase.id]);
  });

  it("combina fecha, carrera, año, materia y comisión", async () => {
    const manana = sumarDias(hoy(), 1);
    const clase = await createClase(institution, fixture, manana);
    const auth = authOf(institution, institution);
    const buscar = async (query: Partial<Omit<ListarClasesQuery, "ambito">>) =>
      (await listarClases(auth, { ...query, ambito: "todas" })).clases.map((item) => item.id);

    expect(await buscar({ fecha: manana, carreraId: fixture.carreraId, anio: 5 })).toEqual([
      clase.id,
    ]);
    expect(
      await buscar({ fecha: manana, materiaId: fixture.materiaId, comisionId: fixture.comisionId }),
    ).toEqual([clase.id]);
    expect(await buscar({ fecha: manana, anio: 4 })).toEqual([]);
    expect(await buscar({ fecha: manana, carreraId: "otra" })).toEqual([]);
    expect(await buscar({ fecha: sumarDias(manana, 1) })).toEqual([]);
  });

  it("al consultar, las clases cuya franja terminó pasan a Finalizada (sin registro)", async () => {
    const ayer = sumarDias(hoy(), -1);
    const vencida = await createClase(institution, fixture, ayer);
    const ausente = await createClase(institution, fixture, ayer, "08:00", "10:00");
    await prisma.claseProgramada.update({ where: { id: ausente.id }, data: { estado: "AUSENTE" } });

    expect(await finalizarClasesVencidas(institution.organizationId)).toBe(1);
    expect(await finalizarClasesVencidas(institution.organizationId)).toBe(0);
    const clases = (
      await listarClases(authOf(institution, institution), { ambito: "todas", fecha: ayer })
    ).clases;
    expect(clases.map((clase) => [clase.id, clase.estado])).toEqual([
      [ausente.id, "AUSENTE"],
      [vencida.id, "FINALIZADA"],
    ]);
  });

  it("el detalle trae la clase con sus datos y 404 fuera de la institución", async () => {
    const clase = await createClase(institution, fixture, hoy(), "00:00", "23:59");
    expect(await obtenerClase(authOf(institution, estudiante), clase.id)).toMatchObject({
      id: clase.id,
      fecha: hoy(),
    });
    await expect(obtenerClase(authOf(institution, estudiante), "no-existe")).rejects.toMatchObject({
      status: 404,
    });
  });
});
