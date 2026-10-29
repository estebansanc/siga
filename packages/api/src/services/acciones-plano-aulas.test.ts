import { prisma } from "@repo/db";
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
} from "../test/db";

import {
  listarAulasDestinoDeClase,
  listarClasesAsignablesAlAula,
  moverClaseDeAula,
  reemplazarClaseDeAula,
} from "./acciones-plano-aulas";
import { asignarAulaAClaseSinAula } from "./asignacion-aulas";

const fecha = "2026-10-14";
const ahora = new Date(`${fecha}T10:00:00-03:00`);
const ocupada = {
  status: 409,
  message: expect.stringContaining("El aula ya está asignada en esa franja: la ocupa la comisión"),
};

let institution: TestOrganization;
let fixture: AcademicFixture;
let aulaLibreId: string;

const bedel = () => authOf(institution, institution);
const docente = () => authOf(institution, fixture.docente);

const crearAula = async (codigo: string, datos: { capacidad?: number; piso?: string } = {}) =>
  (
    await prisma.aula.create({
      data: {
        organizationId: institution.organizationId,
        codigo,
        edificio: "Edificio A",
        piso: datos.piso ?? "PB",
        capacidad: datos.capacidad ?? 40,
        equipamiento: [],
      },
    })
  ).id;

const seguir = async (cantidad: number) => {
  for (let i = 0; i < cantidad; i++) {
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await prisma.comisionSeguida.create({
      data: {
        userId: estudiante.userId,
        comisionId: fixture.comisionId,
        organizationId: institution.organizationId,
      },
    });
  }
};

const aulaDe = async (claseId: string) =>
  (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } })).aulaId;
const correos = () => prisma.emailOutbox.findMany({ orderBy: { createdAt: "asc" } });
const novedades = () => prisma.novedad.findMany();

const otraComision = async (codigo: string) =>
  (
    await prisma.comision.create({
      data: {
        organizationId: institution.organizationId,
        materiaId: fixture.materiaId,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo,
        turno: "NOCHE",
        anioLectivo: 2026,
        docentes: { create: { docenteId: fixture.docente.userId } },
      },
    })
  ).id;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  aulaLibreId = await crearAula("Aula 3");
});

describe("clases asignables a un aula", () => {
  it("lista solo clases de hoy sin aula que caben y encuentran libre la franja", async () => {
    const chica = await crearAula("Aula chica", { capacidad: 2 });
    await seguir(3);
    const sinAula = await createClase(institution, fixture, fecha, "11:00", "13:00", null);
    const solapada = await otraComision("5K9");
    const chocan = await createClase(
      institution,
      { comisionId: solapada, aulaId: null },
      fecha,
      "15:00",
      "16:00",
      null,
    );
    await createClase(
      institution,
      { comisionId: solapada, aulaId: aulaLibreId },
      fecha,
      "15:30",
      "17:00",
      aulaLibreId,
    );
    await createClase(institution, fixture, "2026-10-15", "11:00", "13:00", null);

    const enAulaLibre = await listarClasesAsignablesAlAula(bedel(), aulaLibreId, false, ahora);
    const enAulaChica = await listarClasesAsignablesAlAula(bedel(), chica, false, ahora);

    expect(enAulaLibre.clases.map(({ id }) => id)).toEqual([sinAula.id]);
    expect(enAulaChica.clases.map(({ id }) => id)).toEqual([chocan.id]);
  });

  it("no ofrece clases con solicitud pendiente ni en un aula que no está Disponible", async () => {
    const conPedido = await createClase(institution, fixture, fecha, "11:00", "13:00", null);
    await prisma.solicitudAula.create({
      data: {
        organizationId: institution.organizationId,
        solicitanteId: fixture.docente.userId,
        claseId: conPedido.id,
        aulaId: aulaLibreId,
        alumnos: 20,
        recursos: [],
      },
    });
    await createClase(institution, fixture, fecha, "14:00", "15:00", null);

    expect(
      (await listarClasesAsignablesAlAula(bedel(), aulaLibreId, false, ahora)).clases.map(
        (c) => c.id,
      ),
    ).not.toContain(conPedido.id);
    await prisma.aula.update({ where: { id: aulaLibreId }, data: { estado: "EN_MANTENIMIENTO" } });
    expect((await listarClasesAsignablesAlAula(bedel(), aulaLibreId, false, ahora)).clases).toEqual(
      [],
    );
  });

  it("rechaza al docente con 403", async () => {
    await expect(
      listarClasesAsignablesAlAula(docente(), aulaLibreId, false, ahora),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("clases que pueden reemplazar a la clase en curso", () => {
  it("la franja de la clase en curso no cuenta como ocupada al reemplazar", async () => {
    await createClase(institution, fixture, fecha, "09:00", "11:00");
    const otra = await otraComision("5K9");
    const entrante = await createClase(
      institution,
      { comisionId: otra, aulaId: null },
      fecha,
      "10:00",
      "12:00",
      null,
    );

    const asignando = await listarClasesAsignablesAlAula(bedel(), fixture.aulaId, false, ahora);
    const reemplazando = await listarClasesAsignablesAlAula(bedel(), fixture.aulaId, true, ahora);

    expect(asignando.clases).toEqual([]);
    expect(reemplazando.clases.map(({ id }) => id)).toEqual([entrante.id]);
  });
});

describe("asignar", () => {
  it("la Autoridad asigna, sin novedad, con correo de asignación", async () => {
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    const clase = await createClase(institution, fixture, fecha, "11:00", "13:00", null);

    await asignarAulaAClaseSinAula(
      authOf(institution, autoridad),
      clase.id,
      { aulaId: aulaLibreId },
      ahora,
    );

    expect(await aulaDe(clase.id)).toBe(aulaLibreId);
    expect(await novedades()).toHaveLength(0);
    expect((await correos()).map((c) => c.subject)).toEqual(["Aula asignada: Proyecto Final 5K2"]);
  });

  it("nombra la comisión que ocupa el aula y no cambia nada", async () => {
    const clase = await createClase(institution, fixture, fecha, "11:00", "13:00", null);
    const otra = await otraComision("5K9");
    await createClase(
      institution,
      { comisionId: otra, aulaId: aulaLibreId },
      fecha,
      "12:00",
      "14:00",
    );

    await expect(
      asignarAulaAClaseSinAula(bedel(), clase.id, { aulaId: aulaLibreId }, ahora),
    ).rejects.toMatchObject({
      status: 409,
      message: "El aula ya está asignada en esa franja: la ocupa la comisión 5K9",
    });
    expect(await aulaDe(clase.id)).toBeNull();
  });
});

describe("mover", () => {
  it("lista solo aulas Disponibles, libres y con capacidad, por piso", async () => {
    const clase = await createClase(institution, fixture, fecha, "09:00", "11:00");
    await seguir(5);
    await crearAula("Aula 1", { piso: "2.º piso" });
    await crearAula("Aula chica", { capacidad: 4 });
    const mantenimiento = await crearAula("Aula rota");
    await prisma.aula.update({
      where: { id: mantenimiento },
      data: { estado: "EN_MANTENIMIENTO" },
    });
    const ocupadaId = await crearAula("Aula llena");
    const otra = await otraComision("5K9");
    await createClase(
      institution,
      { comisionId: otra, aulaId: ocupadaId },
      fecha,
      "10:00",
      "12:00",
    );

    const destinos = await listarAulasDestinoDeClase(bedel(), clase.id);

    expect(destinos.map((aula) => aula.codigo)).toEqual(["Aula 3", "Aula 1", "Aula 7"]);
  });

  it("la clase pasa al aula nueva, publica Cambio de aula y avisa la reasignación", async () => {
    const clase = await createClase(institution, fixture, fecha, "09:00", "11:00");

    await moverClaseDeAula(bedel(), clase.id, { aulaId: aulaLibreId }, ahora);

    expect(await aulaDe(clase.id)).toBe(aulaLibreId);
    expect(await novedades()).toMatchObject([{ tipo: "CAMBIO_AULA", aulaNuevaId: aulaLibreId }]);
    expect((await correos()).map((c) => c.subject)).toEqual(["Cambio de aula: Proyecto Final 5K2"]);
    expect(
      await prisma.asignacionAula.findFirst({
        where: { claseId: clase.id, origen: "CAMBIO_AULA" },
      }),
    ).toMatchObject({ aulaId: aulaLibreId, usuarioId: institution.userId });
  });

  it("si el aula se ocupó responde 409 con la comisión y nada cambia", async () => {
    const clase = await createClase(institution, fixture, fecha, "09:00", "11:00");
    const otra = await otraComision("5K9");
    await createClase(
      institution,
      { comisionId: otra, aulaId: aulaLibreId },
      fecha,
      "10:00",
      "12:00",
    );

    await expect(
      moverClaseDeAula(bedel(), clase.id, { aulaId: aulaLibreId }, ahora),
    ).rejects.toMatchObject(ocupada);

    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(await novedades()).toHaveLength(0);
    expect(await correos()).toHaveLength(0);
  });

  it("rechaza una clase terminada con 422 y al estudiante con 403", async () => {
    const terminada = await createClase(institution, fixture, fecha, "07:00", "08:00");
    await expect(
      moverClaseDeAula(bedel(), terminada.id, { aulaId: aulaLibreId }, ahora),
    ).rejects.toMatchObject({ status: 422, message: "La clase ya no admite asignación de aula" });
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await expect(
      moverClaseDeAula(
        authOf(institution, estudiante),
        terminada.id,
        { aulaId: aulaLibreId },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("reemplazar", () => {
  const preparar = async () => {
    const enCurso = await createClase(institution, fixture, fecha, "09:00", "11:00");
    const otra = await otraComision("5K9");
    const entrante = await createClase(
      institution,
      { comisionId: otra, aulaId: null },
      fecha,
      "10:00",
      "12:00",
      null,
    );
    return { enCurso, entrante };
  };

  it("deja a la elegida en el aula y a la anterior en el destino, con un solo Cambio de aula", async () => {
    const { enCurso, entrante } = await preparar();

    const resultado = await reemplazarClaseDeAula(
      bedel(),
      fixture.aulaId,
      { claseId: entrante.id, aulaDestinoId: aulaLibreId },
      ahora,
    );

    expect(resultado.clase.aula?.id).toBe(fixture.aulaId);
    expect(resultado.desplazada.aula?.id).toBe(aulaLibreId);
    expect(await aulaDe(entrante.id)).toBe(fixture.aulaId);
    expect(await aulaDe(enCurso.id)).toBe(aulaLibreId);
    expect(await novedades()).toMatchObject([{ tipo: "CAMBIO_AULA" }]);
    expect((await correos()).map((c) => c.subject).sort()).toEqual([
      "Aula asignada: Proyecto Final 5K9",
      "Cambio de aula: Proyecto Final 5K2",
    ]);
  });

  it("es todo o nada: si el destino se ocupó no cambia ninguna clase", async () => {
    const { enCurso, entrante } = await preparar();
    const otra = await otraComision("5K8");
    await createClase(
      institution,
      { comisionId: otra, aulaId: aulaLibreId },
      fecha,
      "09:30",
      "10:30",
    );

    await expect(
      reemplazarClaseDeAula(
        bedel(),
        fixture.aulaId,
        { claseId: entrante.id, aulaDestinoId: aulaLibreId },
        ahora,
      ),
    ).rejects.toMatchObject(ocupada);

    expect(await aulaDe(enCurso.id)).toBe(fixture.aulaId);
    expect(await aulaDe(entrante.id)).toBeNull();
    expect(await novedades()).toHaveLength(0);
    expect(await correos()).toHaveLength(0);
  });

  it("es todo o nada: si la entrante ya no admite asignación vuelve la clase anterior", async () => {
    const { enCurso, entrante } = await preparar();
    await prisma.claseProgramada.update({
      where: { id: entrante.id },
      data: { estado: "SUSPENDIDA" },
    });

    await expect(
      reemplazarClaseDeAula(
        bedel(),
        fixture.aulaId,
        { claseId: entrante.id, aulaDestinoId: aulaLibreId },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 422, message: "La clase ya no admite asignación de aula" });

    expect(await aulaDe(enCurso.id)).toBe(fixture.aulaId);
    expect(await novedades()).toHaveLength(0);
  });

  it("ignora una clase suspendida que conserva el aula y reemplaza a la activa", async () => {
    const { enCurso, entrante } = await preparar();
    const suspendida = await otraComision("5K7");
    const clase = await createClase(
      institution,
      { comisionId: suspendida, aulaId: fixture.aulaId },
      fecha,
      "08:30",
      "10:30",
    );
    await prisma.claseProgramada.update({
      where: { id: clase.id },
      data: { estado: "SUSPENDIDA" },
    });

    await reemplazarClaseDeAula(
      bedel(),
      fixture.aulaId,
      { claseId: entrante.id, aulaDestinoId: aulaLibreId },
      ahora,
    );

    expect(await aulaDe(enCurso.id)).toBe(aulaLibreId);
    expect(await aulaDe(entrante.id)).toBe(fixture.aulaId);
  });

  it("responde 422 si el aula no tiene clase en curso y 403 al docente", async () => {
    const { entrante } = await preparar();
    await expect(
      reemplazarClaseDeAula(
        bedel(),
        aulaLibreId,
        { claseId: entrante.id, aulaDestinoId: fixture.otraAulaId },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 422, message: "El aula no tiene una clase en curso" });
    await expect(
      reemplazarClaseDeAula(
        docente(),
        fixture.aulaId,
        { claseId: entrante.id, aulaDestinoId: aulaLibreId },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
