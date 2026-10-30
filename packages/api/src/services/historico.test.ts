import { prisma } from "@repo/db";
import {
  instanteArgentino,
  type EstadoClase,
  type MetodoAsistencia,
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
  type TestUser,
} from "../test/db";

import { consultarAsistencias, opcionesHistorico } from "./historico";

let institution: TestOrganization;
let fixture: AcademicFixture;
let autoridad: TestUser;

// Cada comisión admite una sola clase por instante de inicio.
let orden = 0;
const horaDeOrden = () => {
  const minutos = 5 * 60 + orden++;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
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

describe("opciones y permisos", () => {
  it("devuelve los docentes que dictan y las aulas, ordenados", async () => {
    const otra = await segundaComision();
    const opciones = await opcionesHistorico(authOf(institution, autoridad));
    expect(opciones.docentes.map((d) => d.id).sort()).toEqual(
      [fixture.docente.userId, otra.docente.userId].sort(),
    );
    expect(opciones.aulas.map((a) => a.codigo)).toEqual(["Aula 12", "Aula 7"]);
  });

  it.each(["DOCENTE", "ESTUDIANTE"] as const)(
    "%s recibe Acceso denegado en todas las consultas y queda auditado",
    async (perfil) => {
      const auth = authOf(institution, await createUserWithPerfil(institution, perfil));
      const rango = { desde: "2026-03-01", hasta: "2026-03-31", pagina: 1 };
      await expect(consultarAsistencias(auth, rango)).rejects.toMatchObject({
        status: 403,
        message: "Acceso denegado",
      });
      await expect(opcionesHistorico(auth)).rejects.toMatchObject({ status: 403 });
      expect(await accesosDenegados(auth.userId)).toBe(2);
    },
  );
});

const accesosDenegados = (userId: string) =>
  prisma.auditLog.count({ where: { userId, entity: "Permiso", action: "acceso_denegado" } });

const ahora = new Date("2026-03-20T15:00:00.000Z");

const consultaAsistencias = (
  extra: Partial<Parameters<typeof consultarAsistencias>[1]> = {},
  usuario: TestUser | TestOrganization = autoridad,
) =>
  consultarAsistencias(
    authOf(institution, usuario),
    { desde: "2026-03-01", hasta: "2026-03-31", pagina: 1, ...extra },
    ahora,
  );

type ClaseSeed = {
  fecha: string;
  hora?: string;
  comisionId?: string;
  aulaId?: string;
  estado?: EstadoClase;
  modalidad?: "PRESENCIAL" | "VIRTUAL";
  asistencia?: { metodo: MetodoAsistencia; docenteId?: string; llegada?: string };
};

const crearClaseConAsistencia = async ({
  fecha,
  hora = horaDeOrden(),
  comisionId = fixture.comisionId,
  aulaId = fixture.aulaId,
  estado = "FINALIZADA",
  modalidad = "PRESENCIAL",
  asistencia,
}: ClaseSeed) => {
  const clase = await createClase(institution, { comisionId, aulaId }, fecha, hora, "23:59");
  await prisma.claseProgramada.update({ where: { id: clase.id }, data: { estado, modalidad } });
  if (asistencia) {
    await prisma.asistenciaDocente.create({
      data: {
        organizationId: institution.organizationId,
        claseId: clase.id,
        docenteId: asistencia.docenteId ?? fixture.docente.userId,
        metodo: asistencia.metodo,
        horaLlegada: instanteArgentino(fecha, asistencia.llegada ?? "19:10"),
        motivo: asistencia.metodo === "MANUAL" ? "Sin celular" : null,
        registradaPorId:
          asistencia.metodo === "MANUAL"
            ? institution.userId
            : (asistencia.docenteId ?? fixture.docente.userId),
      },
    });
  }
  return clase;
};

describe("consultas históricas de asistencia docente", () => {
  it("sin clases en el período devuelve indicadores vacíos y lista vacía", async () => {
    await crearClaseConAsistencia({ fecha: "2026-02-10", asistencia: { metodo: "QR" } });
    const resultado = await consultaAsistencias();
    expect(resultado).toMatchObject({ total: 0, totalPaginas: 0, registros: [] });
    expect(resultado.indicadores).toMatchObject({
      clasesBase: 0,
      porcentajeAsistencia: null,
      porcentajeQr: null,
      registrosManuales: 0,
    });
  });

  it("calcula los indicadores: base, ausentes, suspendidas, virtuales y sin registro", async () => {
    await crearClaseConAsistencia({ fecha: "2026-03-02", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-03-03", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-03-04", asistencia: { metodo: "MANUAL" } });
    await crearClaseConAsistencia({ fecha: "2026-03-05" });
    await crearClaseConAsistencia({ fecha: "2026-03-06", estado: "AUSENTE" });
    await crearClaseConAsistencia({ fecha: "2026-03-09", estado: "SUSPENDIDA" });
    await crearClaseConAsistencia({ fecha: "2026-03-10", estado: "VIRTUAL", modalidad: "VIRTUAL" });
    await crearClaseConAsistencia({ fecha: "2026-03-25" });

    const { indicadores, total } = await consultaAsistencias();
    expect(indicadores).toEqual({
      clasesBase: 5,
      clasesConAsistencia: 3,
      porcentajeAsistencia: 60,
      clasesSinRegistro: 1,
      registrosQr: 2,
      porcentajeQr: 66.7,
      registrosManuales: 1,
    });
    expect(total).toBe(3);
  });

  it("una clase vencida que seguía Programada pasa a sin registro", async () => {
    await crearClaseConAsistencia({ fecha: "2026-03-02", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-03-03", estado: "PROGRAMADA" });
    const { indicadores } = await consultaAsistencias();
    expect(indicadores).toMatchObject({
      clasesBase: 2,
      clasesSinRegistro: 1,
      porcentajeAsistencia: 50,
    });
  });

  it("muestra cada fila con método y registrante, el más reciente primero", async () => {
    await crearClaseConAsistencia({
      fecha: "2026-03-02",
      asistencia: { metodo: "QR", llegada: "19:05" },
    });
    await crearClaseConAsistencia({
      fecha: "2026-03-03",
      asistencia: { metodo: "MANUAL", llegada: "19:20" },
    });
    const bedel = await prisma.user.findUniqueOrThrow({ where: { id: institution.userId } });
    const { registros } = await consultaAsistencias();
    expect(registros.map((registro) => registro.metodo)).toEqual(["MANUAL", "QR"]);
    expect(registros[0]).toMatchObject({
      registradaEn: instanteArgentino("2026-03-03", "19:20").toISOString(),
      docente: fixture.docente.userName,
      materia: "Proyecto Final",
      comision: "5K2",
      aula: "Aula 12",
      registradaPor: bedel.name,
      registradaPorBedelia: true,
    });
    expect(registros[1]).toMatchObject({
      registradaPor: fixture.docente.userName,
      registradaPorBedelia: false,
    });
  });

  it("el rango incluye ambos días de la clase", async () => {
    await crearClaseConAsistencia({ fecha: "2026-03-01", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-03-31", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-02-28", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({ fecha: "2026-04-01", asistencia: { metodo: "QR" } });
    expect((await consultaAsistencias()).total).toBe(2);
  });

  it("cada filtro restringe indicadores y detalle, y se combinan", async () => {
    const otra = await segundaComision();
    await crearClaseConAsistencia({ fecha: "2026-03-02", asistencia: { metodo: "QR" } });
    await crearClaseConAsistencia({
      fecha: "2026-03-03",
      comisionId: otra.comision.id,
      aulaId: fixture.otraAulaId,
      asistencia: { metodo: "MANUAL", docenteId: otra.docente.userId },
    });
    await crearClaseConAsistencia({ fecha: "2026-03-04" });
    await crearClaseConAsistencia({ fecha: "2026-03-05", comisionId: otra.comision.id });

    const con = async (extra: Parameters<typeof consultaAsistencias>[0]) => {
      const { total, indicadores } = await consultaAsistencias(extra);
      return [total, indicadores.clasesBase, indicadores.clasesSinRegistro];
    };
    expect(await con({})).toEqual([2, 4, 2]);
    expect(await con({ carreraId: otra.carrera.id })).toEqual([1, 2, 1]);
    expect(await con({ materiaId: fixture.materiaId })).toEqual([1, 2, 1]);
    expect(await con({ comisionId: otra.comision.id })).toEqual([1, 2, 1]);
    expect(await con({ docenteId: otra.docente.userId })).toEqual([1, 2, 1]);
    expect(await con({ aulaId: fixture.otraAulaId })).toEqual([1, 1, 0]);
    expect(await con({ aulaId: fixture.aulaId })).toEqual([1, 3, 2]);
    expect(await con({ carreraId: otra.carrera.id, aulaId: fixture.aulaId })).toEqual([0, 1, 1]);
  });

  it("los indicadores cuentan todo el período aunque el detalle pagine de a 20", async () => {
    for (let dia = 1; dia <= 25; dia++) {
      await crearClaseConAsistencia({
        fecha: `2026-03-${String(dia).padStart(2, "0")}`,
        asistencia: { metodo: dia % 5 === 0 ? "MANUAL" : "QR" },
      });
    }
    const primera = await consultaAsistencias();
    const segunda = await consultaAsistencias({ pagina: 2 });
    expect([primera.total, primera.totalPaginas]).toEqual([25, 2]);
    expect(primera.indicadores).toMatchObject({ registrosQr: 20, registrosManuales: 5 });
    expect(primera.registros).toHaveLength(20);
    expect(segunda.registros).toHaveLength(5);
    const ids = new Set([...primera.registros, ...segunda.registros].map((r) => r.id));
    expect(ids.size).toBe(25);
  });

  it("no mezcla instituciones", async () => {
    const otra = await createOrganization();
    const otroFixture = await seedAcademicFixture(otra);
    const clase = await createClase(otra, otroFixture, "2026-03-05", "19:00", "23:59");
    await prisma.claseProgramada.update({
      where: { id: clase.id },
      data: { estado: "FINALIZADA" },
    });
    await prisma.asistenciaDocente.create({
      data: {
        organizationId: otra.organizationId,
        claseId: clase.id,
        docenteId: otroFixture.docente.userId,
        metodo: "QR",
        horaLlegada: instanteArgentino("2026-03-05", "19:05"),
        registradaPorId: otroFixture.docente.userId,
      },
    });
    const { indicadores, total, registros } = await consultaAsistencias();
    expect(total).toBe(0);
    expect(registros).toEqual([]);
    expect(indicadores).toMatchObject({ clasesBase: 0, registrosQr: 0, clasesSinRegistro: 0 });
  });

  it("una consulta de 12 meses con cientos de clases responde en menos de 10 s", async () => {
    const dias = Array.from({ length: 600 }, (_, indice) => {
      const fecha = new Date(Date.UTC(2025, 10, 1 + (indice % 300)));
      return {
        fecha,
        inicio: new Date(fecha.getTime() + (8 + Math.floor(indice / 300)) * 3_600_000),
      };
    });
    await prisma.claseProgramada.createMany({
      data: dias.map(({ fecha, inicio }) => ({
        organizationId: institution.organizationId,
        comisionId: fixture.comisionId,
        aulaId: fixture.aulaId,
        fecha,
        inicio,
        fin: new Date(inicio.getTime() + 3_600_000),
        estado: "FINALIZADA" as const,
      })),
    });
    const clases = await prisma.claseProgramada.findMany({
      where: { organizationId: institution.organizationId },
      select: { id: true },
    });
    await prisma.asistenciaDocente.createMany({
      data: clases.slice(0, 450).map(({ id }, indice) => ({
        organizationId: institution.organizationId,
        claseId: id,
        docenteId: fixture.docente.userId,
        metodo: indice % 4 === 0 ? ("MANUAL" as const) : ("QR" as const),
        horaLlegada: new Date("2026-01-01T12:00:00Z"),
        registradaPorId: fixture.docente.userId,
      })),
    });
    const inicio = Date.now();
    const resultado = await consultarAsistencias(
      authOf(institution, autoridad),
      { desde: "2025-10-21", hasta: "2026-10-21", pagina: 1 },
      new Date("2026-12-31T12:00:00Z"),
    );
    expect(Date.now() - inicio).toBeLessThan(10_000);
    expect(resultado.total).toBe(450);
    expect(resultado.indicadores).toMatchObject({ clasesBase: 600, clasesSinRegistro: 150 });
  });

  it("el Bedel también consulta y las opciones", async () => {
    await crearClaseConAsistencia({ fecha: "2026-03-02", asistencia: { metodo: "MANUAL" } });
    expect((await consultaAsistencias({}, institution)).total).toBe(1);
    expect((await opcionesHistorico(authOf(institution, institution))).aulas).toHaveLength(2);
  });
});
