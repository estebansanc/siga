import { prisma } from "@repo/db";
import { instanteArgentino, type TipoNovedad } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createClase,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { consultarNovedades, opcionesHistorico } from "./historico";

let institution: TestOrganization;
let fixture: AcademicFixture;
let autoridad: TestUser;

const consulta = (extra: Partial<Parameters<typeof consultarNovedades>[1]> = {}) =>
  consultarNovedades(authOf(institution, autoridad), {
    desde: "2026-03-01",
    hasta: "2026-03-31",
    pagina: 1,
    ...extra,
  });

type NovedadSeed = {
  fecha: string;
  hora?: string;
  tipo?: TipoNovedad;
  comisionId?: string;
  fechaClase?: string;
  aulaClaseId?: string;
  aulaNuevaId?: string;
  bedelia?: boolean;
};

// Cada comisión admite una sola clase por instante de inicio.
let orden = 0;
const horaDeOrden = () => {
  const minutos = 5 * 60 + orden++;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
};

const crearNovedad = async ({
  fecha,
  hora = "12:00",
  tipo = "DEMORA",
  comisionId = fixture.comisionId,
  fechaClase = fecha,
  aulaClaseId = fixture.aulaId,
  aulaNuevaId,
  bedelia = false,
}: NovedadSeed) => {
  const clase = await createClase(
    institution,
    { comisionId, aulaId: aulaClaseId },
    fechaClase,
    horaDeOrden(),
    "23:59",
  );
  return prisma.novedad.create({
    data: {
      organizationId: institution.organizationId,
      comisionId,
      tipo,
      aulaNuevaId,
      minutosDemora: tipo === "DEMORA" ? 10 : null,
      publicadaPorId: bedelia ? institution.userId : fixture.docente.userId,
      publicadaPorBedelia: bedelia,
      createdAt: instanteArgentino(fecha, hora),
      clases: { create: { claseId: clase.id } },
    },
  });
};

const segundaComision = async () => {
  const carrera = await prisma.carrera.create({
    data: { organizationId: institution.organizationId, codigo: "M", nombre: "Mecánica" },
  });
  const materia = await prisma.materia.create({
    data: {
      organizationId: institution.organizationId,
      carreraId: carrera.id,
      codigo: "M1",
      nombre: "Física",
      anioCarrera: 1,
    },
  });
  const docente = await createUserWithPerfil(institution, "DOCENTE");
  const comision = await prisma.comision.create({
    data: {
      organizationId: institution.organizationId,
      materiaId: materia.id,
      periodoLectivoId: fixture.periodoLectivoId,
      codigo: "1M1",
      turno: "MANANA",
      anioLectivo: 2026,
      docentes: { create: { docenteId: docente.userId } },
    },
  });
  return { carrera, materia, docente, comision };
};

beforeEach(async () => {
  orden = 0;
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
});

describe("consultas históricas de novedades", () => {
  it("sin novedades en el período devuelve ceros y lista vacía", async () => {
    await crearNovedad({ fecha: "2026-02-15" });
    const resultado = await consulta();
    expect(resultado).toMatchObject({ total: 0, totalPaginas: 0, novedades: [] });
    expect(resultado.porTipo).toEqual({
      AUSENCIA: 0,
      DEMORA: 0,
      VIRTUAL: 0,
      SUSPENSION: 0,
      CAMBIO_AULA: 0,
    });
  });

  it("cuenta por tipo y muestra cada fila con sus datos, la más reciente primero", async () => {
    await crearNovedad({ fecha: "2026-03-05", tipo: "AUSENCIA", fechaClase: "2026-03-06" });
    await crearNovedad({ fecha: "2026-03-10", tipo: "DEMORA", bedelia: true });
    await crearNovedad({ fecha: "2026-03-10", hora: "18:00", tipo: "DEMORA" });

    const resultado = await consulta();
    expect(resultado.total).toBe(3);
    expect(resultado.porTipo).toMatchObject({ AUSENCIA: 1, DEMORA: 2, VIRTUAL: 0 });
    expect(resultado.novedades.map((n) => n.publicadaPorBedelia)).toEqual([false, true, false]);
    expect(resultado.novedades[2]).toMatchObject({
      tipo: "AUSENCIA",
      estado: "ACTIVA",
      materia: "Proyecto Final",
      comision: "5K2",
      fechaClaseDesde: "2026-03-06",
      fechaClaseHasta: "2026-03-06",
      docentes: [fixture.docente.userName],
      publicadaPor: fixture.docente.userName,
    });
  });

  it("el rango incluye ambos días completos en hora argentina", async () => {
    await crearNovedad({ fecha: "2026-03-01", hora: "00:00" });
    await crearNovedad({ fecha: "2026-03-31", hora: "23:59" });
    await crearNovedad({ fecha: "2026-02-28", hora: "23:59" });
    await crearNovedad({ fecha: "2026-04-01", hora: "00:00" });
    expect((await consulta()).total).toBe(2);
  });

  it("cada filtro restringe y se combinan", async () => {
    const otra = await segundaComision();
    await crearNovedad({ fecha: "2026-03-05", tipo: "AUSENCIA" });
    await crearNovedad({ fecha: "2026-03-06", tipo: "DEMORA", comisionId: otra.comision.id });
    await crearNovedad({
      fecha: "2026-03-07",
      tipo: "CAMBIO_AULA",
      aulaNuevaId: fixture.otraAulaId,
    });

    const totalCon = async (extra: Parameters<typeof consulta>[0]) => (await consulta(extra)).total;
    expect(await totalCon({ carreraId: otra.carrera.id })).toBe(1);
    expect(await totalCon({ materiaId: fixture.materiaId })).toBe(2);
    expect(await totalCon({ comisionId: otra.comision.id })).toBe(1);
    expect(await totalCon({ docenteId: otra.docente.userId })).toBe(1);
    expect(await totalCon({ docenteId: fixture.docente.userId })).toBe(2);
    expect(await totalCon({ tipo: "AUSENCIA" })).toBe(1);
    expect(await totalCon({ aulaId: fixture.aulaId })).toBe(3);
    expect(await totalCon({ aulaId: fixture.otraAulaId })).toBe(1);
    expect(await totalCon({ materiaId: fixture.materiaId, tipo: "CAMBIO_AULA" })).toBe(1);
    expect(await totalCon({ carreraId: otra.carrera.id, tipo: "AUSENCIA" })).toBe(0);
  });

  it("los indicadores cuentan todo el período aunque el detalle pagine de a 20", async () => {
    for (let dia = 1; dia <= 25; dia++) {
      await crearNovedad({ fecha: `2026-03-${String(dia).padStart(2, "0")}` });
    }
    const primera = await consulta();
    const segunda = await consulta({ pagina: 2 });
    const tercera = await consulta({ pagina: 3 });
    expect([primera.total, primera.porTipo.DEMORA, primera.totalPaginas]).toEqual([25, 25, 2]);
    expect(primera.novedades).toHaveLength(20);
    expect(segunda.novedades).toHaveLength(5);
    expect(segunda.total).toBe(25);
    expect(tercera.novedades).toHaveLength(0);
    const ids = new Set([...primera.novedades, ...segunda.novedades].map((n) => n.id));
    expect(ids.size).toBe(25);
  });

  it("una novedad que abarca varias clases muestra el rango de fechas", async () => {
    const novedad = await crearNovedad({ fecha: "2026-03-05", fechaClase: "2026-03-09" });
    const otraClase = await createClase(institution, fixture, "2026-03-16");
    await prisma.novedadClase.create({ data: { novedadId: novedad.id, claseId: otraClase.id } });
    const [fila] = (await consulta()).novedades;
    expect([fila?.fechaClaseDesde, fila?.fechaClaseHasta]).toEqual(["2026-03-09", "2026-03-16"]);
  });

  it("no mezcla instituciones", async () => {
    const otra = await createOrganization();
    const otroFixture = await seedAcademicFixture(otra);
    await prisma.novedad.create({
      data: {
        organizationId: otra.organizationId,
        comisionId: otroFixture.comisionId,
        tipo: "AUSENCIA",
        publicadaPorId: otroFixture.docente.userId,
        createdAt: instanteArgentino("2026-03-05", "12:00"),
      },
    });
    expect((await consulta()).total).toBe(0);
  });

  it("una consulta de 12 meses con cientos de novedades responde en menos de 10 s", async () => {
    await prisma.novedad.createMany({
      data: Array.from({ length: 600 }, (_, indice) => ({
        organizationId: institution.organizationId,
        comisionId: fixture.comisionId,
        tipo: "DEMORA" as const,
        publicadaPorId: fixture.docente.userId,
        createdAt: new Date(
          instanteArgentino("2025-11-01", "08:00").getTime() + indice * 3_600_000 * 12,
        ),
      })),
    });
    const inicio = Date.now();
    const resultado = await consulta({ desde: "2025-10-21", hasta: "2026-10-21" });
    expect(Date.now() - inicio).toBeLessThan(10_000);
    expect(resultado.total).toBe(600);
  });
});

describe("opciones y permisos", () => {
  it("devuelve los docentes que dictan y las aulas, ordenados", async () => {
    const otra = await segundaComision();
    const opciones = await opcionesHistorico(authOf(institution, autoridad));
    expect(opciones.docentes.map((d) => d.id).sort()).toEqual(
      [fixture.docente.userId, otra.docente.userId].sort(),
    );
    expect(opciones.aulas.map((a) => a.codigo)).toEqual(["Aula 12", "Aula 7"]);
  });

  it.each(["BEDEL", "DOCENTE", "ESTUDIANTE"] as const)(
    "%s recibe Acceso denegado y queda auditado",
    async (perfil) => {
      const usuario =
        perfil === "BEDEL" ? institution : await createUserWithPerfil(institution, perfil);
      const auth = authOf(institution, usuario);
      await expect(
        consultarNovedades(auth, { desde: "2026-03-01", hasta: "2026-03-31", pagina: 1 }),
      ).rejects.toMatchObject({ status: 403, message: "Acceso denegado" });
      await expect(opcionesHistorico(auth)).rejects.toMatchObject({ status: 403 });
      expect(
        await prisma.auditLog.count({
          where: { userId: auth.userId, entity: "Permiso", action: "acceso_denegado" },
        }),
      ).toBe(2);
    },
  );
});
