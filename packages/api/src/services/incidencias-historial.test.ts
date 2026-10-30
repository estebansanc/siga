import { prisma } from "@repo/db";
import {
  instanteArgentino,
  type ConsultaIncidencias,
  type ElementoIncidencia,
  type EstadoIncidencia,
} from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { consultarHistorialIncidencias } from "./incidencias";

let institution: TestOrganization;
let fixture: AcademicFixture;
let autoridad: TestUser;

const consultar = (
  extra: Partial<ConsultaIncidencias> = {},
  usuario: TestUser | TestOrganization = autoridad,
) =>
  consultarHistorialIncidencias(authOf(institution, usuario), {
    desde: "2026-03-01",
    hasta: "2026-03-31",
    pagina: 1,
    ...extra,
  });

const reportar = (
  fecha: string,
  hora = "10:00",
  datos: {
    estado?: EstadoIncidencia;
    aulaId?: string;
    elemento?: ElementoIncidencia;
    organizationId?: string;
    userId?: string;
  } = {},
) =>
  prisma.incidencia.create({
    data: {
      organizationId: datos.organizationId ?? institution.organizationId,
      aulaId: datos.aulaId ?? fixture.aulaId,
      elemento: datos.elemento ?? "PROYECTOR",
      descripcion: "No enciende",
      gravedad: "LEVE",
      estado: datos.estado ?? "RESUELTA",
      reportadaPorId: datos.userId ?? institution.userId,
      createdAt: instanteArgentino(fecha, hora),
      historial: {
        create: {
          estado: "ABIERTA",
          userId: datos.userId ?? institution.userId,
          createdAt: instanteArgentino(fecha, hora),
        },
      },
    },
  });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
});

describe("detalle", () => {
  it("lista solo las resueltas y cuenta el total del período", async () => {
    await reportar("2026-03-02", "10:00", { estado: "ABIERTA" });
    await reportar("2026-03-03", "10:00", { estado: "EN_CURSO" });
    await reportar("2026-03-04", "10:00", { estado: "RESUELTA" });
    await reportar("2026-03-05", "10:00", { estado: "RESUELTA" });

    const resultado = await consultar();

    expect(resultado.total).toBe(2);
    expect(resultado.incidencias.map(({ estado }) => estado)).toEqual(["RESUELTA", "RESUELTA"]);
  });

  it("muestra aula, elemento, gravedad, estado y quién reportó, la más reciente primero", async () => {
    await reportar("2026-03-02", "10:00", { elemento: "OTRO", aulaId: fixture.otraAulaId });
    await reportar("2026-03-10", "11:30");

    const { incidencias } = await consultar();

    expect(incidencias).toMatchObject([
      {
        reportadaEn: instanteArgentino("2026-03-10", "11:30").toISOString(),
        aula: "Aula 12",
        elemento: "PROYECTOR",
        gravedad: "LEVE",
        estado: "RESUELTA",
        reportadaPor: expect.any(String),
      },
      { aula: "Aula 7", elemento: "OTRO" },
    ]);
  });

  it("incluye la descripción y cada estado con usuario, hora y observaciones", async () => {
    const incidencia = await reportar("2026-03-02");
    await prisma.incidencia.update({ where: { id: incidencia.id }, data: { estado: "RESUELTA" } });
    await prisma.incidenciaEstado.create({
      data: {
        incidenciaId: incidencia.id,
        estado: "RESUELTA",
        observaciones: "Técnico avisado",
        userId: institution.userId,
        createdAt: instanteArgentino("2026-03-03", "09:00"),
      },
    });

    const [detalle] = (await consultar()).incidencias;

    expect(detalle?.descripcion).toBe("No enciende");
    expect(detalle?.historial).toMatchObject([
      { estado: "ABIERTA", observaciones: null },
      {
        estado: "RESUELTA",
        observaciones: "Técnico avisado",
        createdAt: instanteArgentino("2026-03-03", "09:00").toISOString(),
        usuario: { id: institution.userId },
      },
    ]);
  });

  it("filtra por aula en indicadores y detalle", async () => {
    await reportar("2026-03-02", "10:00");
    await reportar("2026-03-03", "10:00", { aulaId: fixture.otraAulaId });

    const resultado = await consultar({ aulaId: fixture.otraAulaId });

    expect(resultado.total).toBe(1);
    expect(resultado.incidencias.map(({ aula }) => aula)).toEqual(["Aula 7"]);
  });

  it("incluye las incidencias de un aula dada de baja", async () => {
    await reportar("2026-03-02", "10:00", { aulaId: fixture.otraAulaId });
    await prisma.aula.update({ where: { id: fixture.otraAulaId }, data: { activa: false } });

    expect((await consultar({ aulaId: fixture.otraAulaId })).total).toBe(1);
  });

  it("sin incidencias devuelve ceros", async () => {
    expect(await consultar()).toMatchObject({
      total: 0,
      totalPaginas: 0,
      incidencias: [],
    });
  });
});

describe("límites del rango (hora argentina)", () => {
  it("incluye los días desde y hasta completos y excluye lo de afuera", async () => {
    await reportar("2026-02-28", "23:59");
    await reportar("2026-03-01", "00:00");
    await reportar("2026-03-31", "23:59");
    await reportar("2026-04-01", "00:00");

    const { incidencias } = await consultar();

    expect(incidencias.map(({ reportadaEn }) => reportadaEn)).toEqual([
      instanteArgentino("2026-03-31", "23:59").toISOString(),
      instanteArgentino("2026-03-01", "00:00").toISOString(),
    ]);
  });
});

describe("paginación", () => {
  it("pagina de a 20, la más reciente primero, con indicadores del total", async () => {
    await prisma.incidencia.createMany({
      data: Array.from({ length: 25 }, (_, indice) => ({
        organizationId: institution.organizationId,
        aulaId: fixture.aulaId,
        elemento: "PROYECTOR" as const,
        descripcion: "x",
        gravedad: "LEVE" as const,
        estado: "RESUELTA" as const,
        reportadaPorId: institution.userId,
        createdAt: new Date(instanteArgentino("2026-03-10", "08:00").getTime() + indice * 60_000),
      })),
    });

    const primera = await consultar();
    const segunda = await consultar({ pagina: 2 });

    expect(primera).toMatchObject({ total: 25, totalPaginas: 2, tamanioPagina: 20 });
    expect(primera.incidencias).toHaveLength(20);
    expect(segunda.incidencias).toHaveLength(5);
    expect(primera.incidencias[0]?.reportadaEn).toBe(
      instanteArgentino("2026-03-10", "08:24").toISOString(),
    );
    expect(segunda.incidencias.at(-1)?.reportadaEn).toBe(
      instanteArgentino("2026-03-10", "08:00").toISOString(),
    );
  });

  it("12 meses con cientos de incidencias responden en menos de 10 s", async () => {
    await prisma.incidencia.createMany({
      data: Array.from({ length: 600 }, (_, indice) => ({
        organizationId: institution.organizationId,
        aulaId: fixture.aulaId,
        elemento: "PROYECTOR" as const,
        descripcion: "x",
        gravedad: "LEVE" as const,
        estado: (["ABIERTA", "EN_CURSO", "RESUELTA"] as const)[indice % 3]!,
        reportadaPorId: institution.userId,
        createdAt: new Date(
          instanteArgentino("2025-11-01", "08:00").getTime() + indice * 3_600_000 * 12,
        ),
      })),
    });

    const inicio = Date.now();
    const resultado = await consultar({ desde: "2025-10-21", hasta: "2026-10-21" });

    expect(Date.now() - inicio).toBeLessThan(10_000);
    expect(resultado.total).toBe(200);
  });
});

describe("permisos y aislamiento", () => {
  it("no mezcla instituciones", async () => {
    const otra = await createOrganization("otra-institucion", "otra-institucion");
    const otroFixture = await seedAcademicFixture(otra);
    await reportar("2026-03-05", "12:00", {
      organizationId: otra.organizationId,
      aulaId: otroFixture.aulaId,
      userId: otroFixture.docente.userId,
    });

    expect((await consultar()).total).toBe(0);
  });

  it("el Bedel y la Autoridad consultan", async () => {
    await reportar("2026-03-02");
    expect((await consultar({}, institution)).total).toBe(1);
    expect((await consultar({}, autoridad)).total).toBe(1);
  });

  it.each(["DOCENTE", "ESTUDIANTE"] as const)(
    "%s recibe Acceso denegado auditado",
    async (perfil) => {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(consultar({}, usuario)).rejects.toMatchObject({
        status: 403,
        message: "Acceso denegado",
      });
      expect(
        await prisma.auditLog.count({
          where: { userId: usuario.userId, entity: "Permiso", action: "acceso_denegado" },
        }),
      ).toBe(1);
    },
  );
});
