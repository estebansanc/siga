import { prisma } from "@repo/db";
import { fechaArgentina, sumarDias } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
  authOf,
  countAuditLogs,
  createClase,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { cambiarEstado } from "./estado-institucional";
import { generarQr, listarClasesDelTurno } from "./qr";
import { updateSettings } from "./settings";

let institution: TestOrganization;
let fixture: AcademicFixture;
const fecha = sumarDias(fechaArgentina(new Date()), 3);
const noche = () => ({ aulaId: fixture.aulaId, turno: "NOCHE" as const, fecha });
const bedel = () => authOf(institution, institution);
const generar = (ahora?: Date) =>
  asOrganization(institution, () => generarQr(bedel(), noche(), ahora));

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  await createClase(institution, fixture, fecha, "19:00", "23:00");
});

describe("generar QR de asistencia", () => {
  it("emite un código que vence a los 60 s y lo guarda como Sesión de QR auditada", async () => {
    const ahora = new Date();
    const sesion = await generar(ahora);
    expect(sesion).toMatchObject({ turno: "NOCHE", fecha, aula: { id: fixture.aulaId } });
    expect(new Date(sesion.venceEn).getTime() - ahora.getTime()).toBe(60_000);
    const guardada = await prisma.sesionQr.findUniqueOrThrow({ where: { id: sesion.id } });
    expect(guardada).toMatchObject({ token: sesion.token, bedelId: institution.userId });
    expect(await countAuditLogs(institution.organizationId, "SesionQr")).toBe(1);
  });

  it("nunca repite el código", async () => {
    const tokens = new Set(
      (await Promise.all([generar(), generar(), generar()])).map((sesion) => sesion.token),
    );
    expect(tokens.size).toBe(3);
    expect(await prisma.sesionQr.count()).toBe(3);
  });

  it("vence al fin del turno si falta menos de 60 s", async () => {
    const hoy = fechaArgentina(new Date());
    await createClase(institution, fixture, hoy, "23:00", "23:30");
    const finTurno = new Date(`${hoy}T23:30:00-03:00`);
    const ahora = new Date(finTurno.getTime() - 20_000);
    const sesion = await asOrganization(institution, () =>
      generarQr(bedel(), { ...noche(), fecha: hoy }, ahora),
    );
    expect(sesion.venceEn).toBe(finTurno.toISOString());
  });

  it("rechaza con la institución Cerrada", async () => {
    await asOrganization(institution, () =>
      cambiarEstado(bedel(), { estado: "CERRADA", motivo: "Prueba QR" }),
    );
    await expect(generar()).rejects.toMatchObject({ status: 422, message: /cerrada/ });
    expect(await prisma.sesionQr.count()).toBe(0);
  });

  it("acepta una institución Cerrada cuya vigencia ya pasó", async () => {
    const ahora = new Date();
    await prisma.estadoInstitucional.create({
      data: {
        organizationId: institution.organizationId,
        estado: "CERRADA",
        motivo: "Prueba QR",
        desde: new Date(ahora.getTime() - 3_600_000),
        vigenciaHasta: new Date(ahora.getTime() - 60_000),
        userId: institution.userId,
      },
    });
    await expect(generar(ahora)).resolves.toMatchObject({ turno: "NOCHE" });
  });

  it("acepta con la institución Abierta con novedades", async () => {
    await asOrganization(institution, () =>
      cambiarEstado(bedel(), { estado: "ABIERTA_CON_NOVEDADES", motivo: "Paro" }),
    );
    await expect(generar()).resolves.toMatchObject({ turno: "NOCHE" });
  });

  it("rechaza un aula sin clases en el turno", async () => {
    const auth = bedel();
    await expect(
      generarQr(auth, { aulaId: fixture.otraAulaId, turno: "NOCHE", fecha }),
    ).rejects.toMatchObject({ status: 422, message: /no tiene clases/ });
    await expect(
      generarQr(auth, { aulaId: fixture.aulaId, turno: "MANANA", fecha }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza una fecha pasada y un turno terminado", async () => {
    const hoy = fechaArgentina(new Date());
    const ayer = sumarDias(hoy, -1);
    await expect(generarQr(bedel(), { ...noche(), fecha: ayer })).rejects.toMatchObject({
      status: 422,
      message: /fecha/,
    });
    const despuesDelTurno = new Date(`${hoy}T23:45:00-03:00`);
    await expect(
      generarQr(bedel(), { ...noche(), fecha: hoy }, despuesDelTurno),
    ).rejects.toMatchObject({ status: 422, message: /turno/ });
  });

  it("rechaza un aula de otra organización", async () => {
    const otra = await createOrganization();
    const ajena = await prisma.aula.create({
      data: {
        organizationId: otra.organizationId,
        codigo: "Aula 99",
        edificio: "C",
        piso: "PB",
        capacidad: 10,
        equipamiento: [],
      },
    });
    await expect(generarQr(bedel(), { ...noche(), aulaId: ajena.id })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rechaza un aula inexistente", async () => {
    await expect(generarQr(bedel(), { ...noche(), aulaId: "no-existe" })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("usa los turnos configurados", async () => {
    await createClase(institution, fixture, fecha, "08:00", "09:00");
    const turnos = {
      MANANA: { inicio: "07:00", fin: "13:00" },
      TARDE: { inicio: "13:00", fin: "18:00" },
      NOCHE: { inicio: "20:00", fin: "23:30" },
    };
    await updateSettings(institution.organizationId, { turnos });
    const clases = await listarClasesDelTurno(bedel(), noche());
    expect(clases).toHaveLength(1);
    expect(clases[0]).toMatchObject({ horaInicio: "19:00" });
  });

  it("niega y audita a los demás perfiles", async () => {
    for (const perfil of ["DOCENTE", "ESTUDIANTE", "AUTORIDAD"] as const) {
      const usuario = await createUserWithPerfil(institution, perfil);
      const auth = authOf(institution, usuario);
      await expect(generarQr(auth, noche())).rejects.toMatchObject({ status: 403 });
      await expect(listarClasesDelTurno(auth, noche())).rejects.toMatchObject({ status: 403 });
    }
    expect(await countAuditLogs(institution.organizationId, "Permiso")).toBe(6);
    expect(await prisma.sesionQr.count()).toBe(0);
  });
});

describe("clases del aula en el turno", () => {
  it("lista las presenciales no suspendidas ni finalizadas que se superponen con el turno", async () => {
    const suspendida = await createClase(institution, fixture, fecha, "19:15", "20:00");
    await prisma.claseProgramada.update({
      where: { id: suspendida.id },
      data: { estado: "SUSPENDIDA" },
    });
    const virtual = await createClase(institution, fixture, fecha, "20:00", "21:00");
    await prisma.claseProgramada.update({
      where: { id: virtual.id },
      data: { modalidad: "VIRTUAL" },
    });
    await createClase(institution, fixture, fecha, "10:00", "12:00");
    const clases = await listarClasesDelTurno(bedel(), noche());
    expect(clases.map((clase) => clase.horaInicio)).toEqual(["19:00"]);
    expect(clases[0]).toMatchObject({
      materia: { nombre: "Proyecto Final" },
      comision: { codigo: "5K2" },
      docentes: [{ id: fixture.docente.userId }],
    });
  });

  it("muestra al bedel el estado de asistencia de cada clase", async () => {
    const conRegistro = await createClase(institution, fixture, fecha, "21:00", "22:00");
    await prisma.asistenciaDocente.create({
      data: {
        organizationId: institution.organizationId,
        claseId: conRegistro.id,
        docenteId: fixture.docente.userId,
        metodo: "QR",
        validacion: "RED",
        horaLlegada: new Date(`${fecha}T21:02:00-03:00`),
        registradaPorId: fixture.docente.userId,
      },
    });
    const clases = await listarClasesDelTurno(bedel(), noche());
    expect(clases.map((clase) => clase.asistencia?.metodo ?? null)).toEqual([null, "QR"]);
    expect(clases[1]?.asistencia).toMatchObject({ horaLlegada: "21:02" });
  });

  it("incluye una clase que empieza antes del turno pero lo cruza", async () => {
    await createClase(institution, fixture, fecha, "17:00", "18:30");
    const clases = await listarClasesDelTurno(bedel(), noche());
    expect(clases.map((clase) => clase.horaInicio)).toEqual(["17:00", "19:00"]);
  });
});
