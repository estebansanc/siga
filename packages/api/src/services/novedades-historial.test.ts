import { prisma } from "@repo/db";
import {
  fechaArgentina,
  instanteArgentino,
  sumarDias,
  type ConsultaNovedades,
  type TipoNovedad,
} from "@repo/domain";
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
} from "../test/db";

import { consultarHistorialNovedades, listarNovedades } from "./novedades";

let institution: TestOrganization;
let fixture: AcademicFixture;

const consultar = (
  extra: Partial<ConsultaNovedades> = {},
  auth = authOf(institution, institution),
) =>
  consultarHistorialNovedades(auth, {
    desde: "2026-03-01",
    hasta: "2026-03-31",
    pagina: 1,
    ...extra,
  });

type NovedadSeed = {
  fecha: string;
  hora?: string;
  tipo?: TipoNovedad;
  estado?: "ACTIVA" | "FINALIZADA";
  fechaClase?: string;
  comisionId?: string;
  docenteId?: string;
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
  estado = "ACTIVA",
  fechaClase = fecha,
  comisionId = fixture.comisionId,
  docenteId = fixture.docente.userId,
}: NovedadSeed) => {
  const clase = await createClase(
    institution,
    { comisionId, aulaId: fixture.aulaId },
    fechaClase,
    horaDeOrden(),
    "23:59",
  );
  return prisma.novedad.create({
    data: {
      organizationId: institution.organizationId,
      comisionId,
      tipo,
      estado,
      minutosDemora: tipo === "DEMORA" ? 10 : null,
      publicadaPorId: docenteId,
      createdAt: instanteArgentino(fecha, hora),
      clases: { create: { claseId: clase.id } },
    },
  });
};

const mañana = () => sumarDias(fechaArgentina(new Date()), 1);

beforeEach(async () => {
  orden = 0;
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("Activas e Historial no comparten novedades", () => {
  it("una activa con clase futura va a Activas; una finalizada o sin clases por delante, a Historial", async () => {
    const hoy = fechaArgentina(new Date());
    const activa = await crearNovedad({ fecha: hoy, fechaClase: mañana() });
    const finalizada = await crearNovedad({
      fecha: hoy,
      fechaClase: mañana(),
      estado: "FINALIZADA",
    });
    const sinClasesPorDelante = await crearNovedad({
      fecha: hoy,
      tipo: "AUSENCIA",
      fechaClase: sumarDias(hoy, -3),
    });
    const bedel = authOf(institution, institution);

    const activas = (await listarNovedades(bedel)).map(({ id }) => id);
    const historial = (
      await consultar({ desde: sumarDias(hoy, -30), hasta: mañana() })
    ).novedades.map(({ id }) => id);

    expect(activas).toEqual([activa.id]);
    expect(historial.sort()).toEqual([finalizada.id, sinClasesPorDelante.id].sort());
  });

  it("una novedad con una clase en curso sigue en Activas", async () => {
    const hoy = fechaArgentina(new Date());
    const novedad = await crearNovedad({ fecha: hoy, fechaClase: hoy });
    await prisma.claseProgramada.updateMany({
      where: { novedades: { some: { novedadId: novedad.id } } },
      data: {
        inicio: new Date(Date.now() - 3600_000),
        fin: new Date(Date.now() + 3600_000),
      },
    });

    expect((await listarNovedades(authOf(institution, institution))).map(({ id }) => id)).toEqual([
      novedad.id,
    ]);
    expect((await consultar({ desde: sumarDias(hoy, -1), hasta: mañana() })).total).toBe(0);
  });
});

describe("Historial de novedades", () => {
  it("sin novedades en el período devuelve ceros y lista vacía", async () => {
    await crearNovedad({ fecha: "2026-02-15" });
    const resultado = await consultar();
    expect(resultado).toMatchObject({ total: 0, totalPaginas: 0, novedades: [] });
    expect(resultado.porTipo).toEqual({
      AUSENCIA: 0,
      DEMORA: 0,
      VIRTUAL: 0,
      SUSPENSION: 0,
      CAMBIO_AULA: 0,
    });
  });

  it("cuenta por tipo y filtra por tipo, la más reciente primero", async () => {
    await crearNovedad({ fecha: "2026-03-05", tipo: "AUSENCIA" });
    await crearNovedad({ fecha: "2026-03-10", tipo: "DEMORA" });
    await crearNovedad({ fecha: "2026-03-11", hora: "18:00", tipo: "DEMORA" });

    const todas = await consultar();
    const demoras = await consultar({ tipo: "DEMORA" });

    expect(todas.total).toBe(3);
    expect(todas.porTipo).toMatchObject({ AUSENCIA: 1, DEMORA: 2, VIRTUAL: 0 });
    expect(todas.novedades[0]).toMatchObject({
      tipo: "DEMORA",
      editable: false,
      comision: { codigo: "5K2", materia: "Proyecto Final" },
    });
    expect(demoras.total).toBe(2);
    expect(demoras.novedades.map(({ tipo }) => tipo)).toEqual(["DEMORA", "DEMORA"]);
  });

  it("el rango incluye ambos días completos en hora argentina", async () => {
    await crearNovedad({ fecha: "2026-03-01", hora: "00:00" });
    await crearNovedad({ fecha: "2026-03-31", hora: "23:59" });
    await crearNovedad({ fecha: "2026-02-28", hora: "23:59" });
    await crearNovedad({ fecha: "2026-04-01", hora: "00:00" });
    expect((await consultar()).total).toBe(2);
  });

  it("los totales cuentan todo el período aunque el detalle pagine de a 20", async () => {
    for (let dia = 1; dia <= 25; dia++) {
      await crearNovedad({ fecha: `2026-03-${String(dia).padStart(2, "0")}` });
    }
    const primera = await consultar();
    const segunda = await consultar({ pagina: 2 });
    const tercera = await consultar({ pagina: 3 });

    expect([primera.total, primera.porTipo.DEMORA, primera.totalPaginas]).toEqual([25, 25, 2]);
    expect(primera.novedades).toHaveLength(20);
    expect(segunda.novedades).toHaveLength(5);
    expect(tercera.novedades).toHaveLength(0);
    expect(new Set([...primera.novedades, ...segunda.novedades].map(({ id }) => id)).size).toBe(25);
  });

  it("no mezcla instituciones", async () => {
    const otra = await createOrganization();
    const otroFixture = await seedAcademicFixture(otra);
    await prisma.novedad.create({
      data: {
        organizationId: otra.organizationId,
        comisionId: otroFixture.comisionId,
        tipo: "AUSENCIA",
        estado: "FINALIZADA",
        publicadaPorId: otroFixture.docente.userId,
        createdAt: instanteArgentino("2026-03-05", "12:00"),
      },
    });
    expect((await consultar()).total).toBe(0);
  });
});

describe("rendimiento", () => {
  it("una consulta de 12 meses con cientos de novedades responde en menos de 10 s", async () => {
    await prisma.novedad.createMany({
      data: Array.from({ length: 600 }, (_, indice) => ({
        organizationId: institution.organizationId,
        comisionId: fixture.comisionId,
        tipo: "DEMORA" as const,
        estado: "FINALIZADA" as const,
        publicadaPorId: fixture.docente.userId,
        createdAt: new Date(
          instanteArgentino("2025-11-01", "08:00").getTime() + indice * 3_600_000 * 12,
        ),
      })),
    });
    const inicio = Date.now();
    const resultado = await consultar({ desde: "2025-10-21", hasta: "2026-10-21" });
    expect(Date.now() - inicio).toBeLessThan(10_000);
    expect(resultado.total).toBe(600);
  });
});

describe("permisos del Historial de novedades", () => {
  it("el Docente solo ve las de sus comisiones; Bedel y Autoridad, todas", async () => {
    const otroDocente = await createUserWithPerfil(institution, "DOCENTE");
    await crearNovedad({ fecha: "2026-03-05", estado: "FINALIZADA" });
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");

    expect((await consultar({}, authOf(institution, fixture.docente))).total).toBe(1);
    expect((await consultar({}, authOf(institution, otroDocente))).total).toBe(0);
    expect((await consultar({}, authOf(institution, autoridad))).total).toBe(1);
    expect((await consultar()).total).toBe(1);
  });

  it("el Estudiante recibe Acceso denegado", async () => {
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await expect(consultar({}, authOf(institution, estudiante))).rejects.toMatchObject({
      status: 403,
    });
  });
});
