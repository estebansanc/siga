import { generarClasesProgramadas, prisma, toDateColumn } from "@repo/db";
import type { ConsultaUsoAulas, EstadoClase } from "@repo/domain";
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

import {
  aprobarSolicitudAula,
  asignarAulaAClaseSinAula,
  reasignarSolicitudAula,
} from "./asignacion-aulas";
import { consultarUsoAulas } from "./historico";
import { finalizarNovedad, publicarNovedad } from "./novedades";
import { crearSolicitudAula } from "./solicitudes-aula";

// 2027-03-15 es lunes: la semana lunes a domingo tiene 6 días de cursado (16,5 h cada uno).
const lunes = "2027-03-15";
const domingo = "2027-03-21";
const ahora = new Date(`${lunes}T10:00:00-03:00`);
const horasSemana = 99;

let institution: TestOrganization;
let fixture: AcademicFixture;
let autoridad: TestUser;

const consultar = (
  extra: Partial<ConsultaUsoAulas> = {},
  usuario: TestUser | TestOrganization = autoridad,
) =>
  consultarUsoAulas(
    authOf(institution, usuario),
    { desde: lunes, hasta: domingo, pagina: 1, ...extra },
    ahora,
  );

const bedel = () => authOf(institution, institution);
const docente = () => authOf(institution, fixture.docente);

const claseEn = (
  dia: string,
  inicio: string,
  fin: string,
  aulaId: string | null = fixture.aulaId,
) => createClase(institution, fixture, dia, inicio, fin, aulaId);

const registradas = async () =>
  (await consultar()).asignaciones.map(({ origen, aula }) => `${origen} ${aula}`);

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
});

describe("ocupación por aula", () => {
  it("calcula horas ocupadas, disponibles y porcentaje entero, de mayor a menor", async () => {
    await claseEn(lunes, "19:00", "23:00");
    await claseEn("2027-03-16", "08:00", "10:00", fixture.otraAulaId);

    const { aulas, ocupacionGeneral } = await consultar();

    expect(aulas).toMatchObject([
      { codigo: "Aula 12", horasOcupadas: 4, horasDisponibles: horasSemana, porcentaje: 4 },
      { codigo: "Aula 7", horasOcupadas: 2, horasDisponibles: horasSemana, porcentaje: 2 },
    ]);
    expect(ocupacionGeneral).toEqual({ horasOcupadas: 6, horasDisponibles: 198, porcentaje: 3 });
  });

  it("desempata por código y lista un aula activa sin clases con 0 %", async () => {
    const { aulas } = await consultar();
    expect(aulas.map(({ codigo, porcentaje }) => [codigo, porcentaje])).toEqual([
      ["Aula 12", 0],
      ["Aula 7", 0],
    ]);
  });

  it.each<EstadoClase>(["SUSPENDIDA", "AUSENTE"])(
    "una clase %s no suma ocupación",
    async (estado) => {
      const clase = await claseEn(lunes, "19:00", "23:00");
      await prisma.claseProgramada.update({ where: { id: clase.id }, data: { estado } });
      expect((await consultar()).ocupacionGeneral.horasOcupadas).toBe(0);
    },
  );

  it("una clase Virtual o sin aula no suma ocupación", async () => {
    const virtual = await claseEn(lunes, "19:00", "23:00");
    await prisma.claseProgramada.update({
      where: { id: virtual.id },
      data: { modalidad: "VIRTUAL" },
    });
    await claseEn("2027-03-16", "19:00", "23:00", null);
    expect((await consultar()).ocupacionGeneral.horasOcupadas).toBe(0);
  });

  it("el domingo y los días no laborables no suman horas disponibles", async () => {
    await prisma.diaNoLaborable.create({
      data: {
        organizationId: institution.organizationId,
        fecha: toDateColumn("2027-03-17"),
        motivo: "Feriado",
      },
    });
    expect((await consultar()).aulas[0]?.horasDisponibles).toBe(82.5);
  });

  it("usa los turnos configurados de la institución", async () => {
    await prisma.organizationSettings.upsert({
      where: { organizationId: institution.organizationId },
      create: {
        organizationId: institution.organizationId,
        turnos: {
          MANANA: { inicio: "08:00", fin: "12:00" },
          TARDE: { inicio: "14:00", fin: "18:00" },
          NOCHE: { inicio: "19:00", fin: "23:00" },
        },
      },
      update: {},
    });
    expect((await consultar()).aulas[0]?.horasDisponibles).toBe(72);
  });

  it("un aula dada de baja figura solo si tiene clases en el rango", async () => {
    const baja = await prisma.aula.create({
      data: {
        organizationId: institution.organizationId,
        codigo: "Aula 1",
        edificio: "A",
        piso: "PB",
        capacidad: 10,
        equipamiento: [],
        activa: false,
      },
    });
    expect((await consultar()).aulas.map(({ codigo }) => codigo)).not.toContain("Aula 1");

    await claseEn(lunes, "08:00", "09:00", baja.id);
    const { aulas } = await consultar();
    expect(aulas.find(({ codigo }) => codigo === "Aula 1")).toMatchObject({
      activa: false,
      horasOcupadas: 1,
    });
  });

  it("las clases fuera del rango (ambos días incluidos) no cuentan", async () => {
    await claseEn("2027-03-14", "20:00", "22:00");
    await claseEn(domingo, "20:00", "22:00");
    await claseEn("2027-03-22", "20:00", "22:00");
    expect((await consultar()).ocupacionGeneral.horasOcupadas).toBe(2);
  });

  it("los filtros restringen ocupación y asignaciones, solos y combinados", async () => {
    const clase = await claseEn(lunes, "19:00", "23:00");
    await claseEn("2027-03-16", "08:00", "10:00", fixture.otraAulaId);
    await prisma.asignacionAula.createMany({
      data: [
        { aulaId: fixture.aulaId, claseId: clase.id, origen: "GENERACION_CLASES" as const },
        { aulaId: fixture.otraAulaId, claseId: clase.id, origen: "ASIGNACION_BEDELIA" as const },
      ].map((datos) => ({ ...datos, organizationId: institution.organizationId })),
    });

    const porAula = await consultar({ aulaId: fixture.otraAulaId });
    expect(porAula.aulas.map(({ codigo }) => codigo)).toEqual(["Aula 7"]);
    expect(porAula.asignaciones.map(({ aula }) => aula)).toEqual(["Aula 7"]);
    expect(porAula.ocupacionGeneral.horasOcupadas).toBe(2);

    const porOrigen = await consultar({ origen: "GENERACION_CLASES" });
    expect(porOrigen.asignaciones.map(({ aula }) => aula)).toEqual(["Aula 12"]);
    expect(porOrigen.aulas).toHaveLength(2);
    expect(porOrigen.ocupacionGeneral.horasOcupadas).toBe(6);

    expect((await consultar({ comisionId: "no-existe" })).total).toBe(0);
    expect(
      (await consultar({ carreraId: fixture.carreraId, materiaId: fixture.materiaId })).total,
    ).toBe(2);
    expect((await consultar({ docenteId: fixture.docente.userId })).total).toBe(2);
    expect(
      (await consultar({ docenteId: fixture.docente.userId, aulaId: fixture.aulaId })).total,
    ).toBe(1);
    expect((await consultar({ docenteId: autoridad.userId })).ocupacionGeneral.horasOcupadas).toBe(
      0,
    );
  });

  it("informa las clases del período para mostrar Sin registros", async () => {
    expect(await consultar()).toMatchObject({ clasesDelPeriodo: 0, total: 0, asignaciones: [] });
    await claseEn(lunes, "19:00", "23:00");
    expect((await consultar()).clasesDelPeriodo).toBe(1);
  });
});

describe("asignaciones por origen", () => {
  it("la generación de clases registra el aula habitual y quien generó", async () => {
    await generarClasesProgramadas(
      prisma,
      institution.organizationId,
      { comisionId: fixture.comisionId, usuarioId: institution.userId },
      "2026-10-05",
    );
    const resultado = await consultarUsoAulas(
      bedel(),
      { desde: "2026-10-05", hasta: "2026-10-31", pagina: 1 },
      ahora,
    );
    expect(resultado.total).toBe(4);
    expect(resultado.asignaciones[0]).toMatchObject({
      origen: "GENERACION_CLASES",
      aula: "Aula 12",
      materia: "Proyecto Final",
      comision: "5K2",
      horaInicioClase: "19:00",
      horaFinClase: "23:00",
      usuario: expect.stringContaining("Usuario"),
    });
  });

  it("sin usuario consignado figura como Sistema", async () => {
    await generarClasesProgramadas(prisma, institution.organizationId, {}, "2026-10-05");
    const { asignaciones } = await consultarUsoAulas(
      bedel(),
      { desde: "2026-10-05", hasta: "2026-10-31", pagina: 1 },
      ahora,
    );
    expect(asignaciones[0]?.usuario).toBe("Sistema");
  });

  it("una solicitud que nace Asignada es una asignación inmediata del solicitante", async () => {
    const clase = await claseEn(lunes, "10:20", "12:00", null);
    await crearSolicitudAula(
      docente(),
      { claseId: clase.id, aulaId: fixture.otraAulaId, alumnos: 20, recursos: [] },
      ahora,
    );
    const [asignacion] = (await consultar()).asignaciones;
    expect(asignacion).toMatchObject({
      origen: "ASIGNACION_INMEDIATA",
      usuario: fixture.docente.userName,
      aula: "Aula 7",
    });
  });

  it("una solicitud aprobada queda con su origen y el bedel que la aprobó", async () => {
    const clase = await claseEn("2027-03-16", "11:00", "13:00", null);
    const solicitud = await crearSolicitudAula(
      docente(),
      { claseId: clase.id, aulaId: fixture.otraAulaId, alumnos: 20, recursos: [] },
      ahora,
    );
    await aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: fixture.otraAulaId }, ahora);
    const nombreDelBedel = (
      await prisma.user.findUniqueOrThrow({ where: { id: institution.userId } })
    ).name;
    expect((await consultar()).asignaciones).toMatchObject([
      { origen: "SOLICITUD_APROBADA", usuario: nombreDelBedel, aula: "Aula 7" },
    ]);
  });

  it("asignar aula a una clase sin aula es una asignación de bedelía", async () => {
    const clase = await claseEn("2027-03-16", "11:00", "13:00", null);
    await asignarAulaAClaseSinAula(bedel(), clase.id, { aulaId: fixture.aulaId }, ahora);
    const [asignacion] = (await consultar()).asignaciones;
    expect(asignacion).toMatchObject({
      origen: "ASIGNACION_BEDELIA",
      aula: "Aula 12",
      fechaClase: "2027-03-16",
      horaInicioClase: "11:00",
      horaFinClase: "13:00",
    });
  });

  it("reasignar una inmediata es un Cambio de aula", async () => {
    const clase = await claseEn(lunes, "10:20", "12:00", null);
    const solicitud = await crearSolicitudAula(
      docente(),
      { claseId: clase.id, aulaId: fixture.otraAulaId, alumnos: 20, recursos: [] },
      ahora,
    );
    await reasignarSolicitudAula(bedel(), solicitud.id, { aulaId: fixture.aulaId }, ahora);
    expect((await registradas()).sort()).toEqual([
      "ASIGNACION_INMEDIATA Aula 7",
      "CAMBIO_AULA Aula 12",
    ]);
  });

  it("publicar un Cambio de aula y finalizarlo (aula restituida) quedan registrados", async () => {
    const clase = await claseEn("2027-03-17", "19:00", "23:00");
    const novedad = await publicarNovedad(docente(), {
      tipo: "CAMBIO_AULA",
      claseIds: [clase.id],
      aulaNuevaId: fixture.otraAulaId,
    });
    expect(await registradas()).toEqual(["CAMBIO_AULA Aula 7"]);

    await finalizarNovedad(docente(), novedad.id);
    const { asignaciones } = await consultar();
    expect(asignaciones.map(({ origen, aula }) => `${origen} ${aula}`).sort()).toEqual([
      "CAMBIO_AULA Aula 12",
      "CAMBIO_AULA Aula 7",
    ]);
    expect(asignaciones.every(({ usuario }) => usuario === fixture.docente.userName)).toBe(true);
  });
});

describe("paginación y permisos", () => {
  it("pagina de a 20 con la asignación más reciente primero", async () => {
    const clase = await claseEn(lunes, "19:00", "23:00");
    await prisma.asignacionAula.createMany({
      data: Array.from({ length: 25 }, (_, indice) => ({
        organizationId: institution.organizationId,
        claseId: clase.id,
        aulaId: fixture.aulaId,
        origen: "ASIGNACION_BEDELIA" as const,
        createdAt: new Date(Date.UTC(2027, 0, 1, 12, indice)),
      })),
    });

    const primera = await consultar();
    const segunda = await consultar({ pagina: 2 });

    expect(primera).toMatchObject({ total: 25, totalPaginas: 2, tamanioPagina: 20 });
    expect(primera.asignaciones).toHaveLength(20);
    expect(segunda.asignaciones).toHaveLength(5);
    expect(primera.asignaciones[0]?.asignadaEn).toBe("2027-01-01T12:24:00.000Z");
    expect(segunda.asignaciones.at(-1)?.asignadaEn).toBe("2027-01-01T12:00:00.000Z");
  });

  it("no mezcla instituciones", async () => {
    const clase = await claseEn(lunes, "19:00", "23:00");
    await prisma.asignacionAula.create({
      data: {
        organizationId: institution.organizationId,
        claseId: clase.id,
        aulaId: fixture.aulaId,
        origen: "GENERACION_CLASES",
      },
    });
    const otra = await createOrganization("otra-institucion", "otra-institucion");
    const resultado = await consultarUsoAulas(
      authOf(otra, otra),
      { desde: lunes, hasta: domingo, pagina: 1 },
      ahora,
    );
    expect(resultado).toMatchObject({ aulas: [], clasesDelPeriodo: 0, total: 0, asignaciones: [] });
  });

  it("el Bedel consulta", async () => {
    expect((await consultar({}, institution)).aulas).toHaveLength(2);
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

  it("12 meses con cientos de clases y asignaciones responden en menos de 10 s", async () => {
    await prisma.claseProgramada.createMany({
      data: Array.from({ length: 600 }, (_, indice) => {
        const inicio = new Date(Date.UTC(2026, 0, 1 + (indice % 300), 11, 0, indice));
        return {
          organizationId: institution.organizationId,
          comisionId: fixture.comisionId,
          aulaId: indice % 2 === 0 ? fixture.aulaId : fixture.otraAulaId,
          fecha: toDateColumn(inicio.toISOString().slice(0, 10)),
          inicio,
          fin: new Date(inicio.getTime() + 3_600_000),
        };
      }),
    });
    const clases = await prisma.claseProgramada.findMany({ select: { id: true, aulaId: true } });
    await prisma.asignacionAula.createMany({
      data: clases.map(({ id, aulaId }) => ({
        organizationId: institution.organizationId,
        claseId: id,
        aulaId: aulaId!,
        origen: "GENERACION_CLASES" as const,
      })),
    });

    const inicio = Date.now();
    const resultado = await consultar({ desde: "2026-01-01", hasta: "2026-12-31" });
    expect(Date.now() - inicio).toBeLessThan(10_000);
    expect(resultado.total).toBe(600);
    expect(resultado.ocupacionGeneral.horasOcupadas).toBe(600);
  });
});
