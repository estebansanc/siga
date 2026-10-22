import { prisma } from "@repo/db";
import { fechaArgentina } from "@repo/domain";
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

import { registrarAsistenciaManual } from "./asistencias";
import { obtenerClase } from "./clases";

let institution: TestOrganization;
let fixture: AcademicFixture;
let claseId: string;
const hoy = fechaArgentina(new Date());
const ahora = new Date(`${hoy}T20:30:00-03:00`);
const bedel = () => authOf(institution, institution);
const registro = (cambios: Partial<Parameters<typeof registrarAsistenciaManual>[1]> = {}) => ({
  claseId,
  docenteId: fixture.docente.userId,
  horaLlegada: "19:05",
  motivo: "Teléfono sin batería",
  ...cambios,
});
const registrar = (cambios = {}, instante = ahora) =>
  asOrganization(institution, () =>
    registrarAsistenciaManual(bedel(), registro(cambios), instante),
  );

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  claseId = (await createClase(institution, fixture, hoy, "19:00", "23:00")).id;
});

describe("registro manual de asistencia", () => {
  it("guarda la asistencia manual, pasa la clase a Docente presente y queda auditada", async () => {
    const asistencia = await registrar();
    expect(asistencia).toMatchObject({
      metodo: "MANUAL",
      horaLlegada: "19:05",
      motivo: "Teléfono sin batería",
      docente: { id: fixture.docente.userId },
      registradaPor: { id: institution.userId },
    });
    const clase = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } });
    expect(clase.estado).toBe("DOCENTE_PRESENTE");
    expect(await countAuditLogs(institution.organizationId, "AsistenciaDocente")).toBe(1);
    expect(await countAuditLogs(institution.organizationId, "ClaseProgramada")).toBe(1);
  });

  it("acepta una clase Demorada", async () => {
    await prisma.claseProgramada.update({ where: { id: claseId }, data: { estado: "DEMORADA" } });
    await registrar();
    expect((await prisma.asistenciaDocente.findFirstOrThrow()).claseId).toBe(claseId);
  });

  it("rechaza una segunda asistencia con el método y la hora de la primera", async () => {
    await registrar();
    await expect(registrar({ horaLlegada: "19:30" })).rejects.toMatchObject({
      status: 409,
      message: "Esta clase ya tiene asistencia registrada: Registro manual a las 19:05.",
    });
    expect(await prisma.asistenciaDocente.count()).toBe(1);
  });

  it("informa una asistencia previa por QR", async () => {
    await prisma.asistenciaDocente.create({
      data: {
        organizationId: institution.organizationId,
        claseId,
        docenteId: fixture.docente.userId,
        metodo: "QR",
        horaLlegada: new Date(`${hoy}T19:10:00-03:00`),
        registradaPorId: fixture.docente.userId,
      },
    });
    await expect(registrar()).rejects.toMatchObject({
      status: 409,
      message: "Esta clase ya tiene asistencia registrada: QR a las 19:10.",
    });
  });

  it("de dos registros simultáneos solo uno entra", async () => {
    const resultados = await Promise.allSettled([registrar(), registrar()]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({
      reason: { status: 409 },
    });
    expect(await prisma.asistenciaDocente.count()).toBe(1);
  });

  it.each(["AUSENTE", "SUSPENDIDA", "FINALIZADA", "VIRTUAL"] as const)(
    "rechaza una clase %s",
    async (estado) => {
      await prisma.claseProgramada.update({ where: { id: claseId }, data: { estado } });
      await expect(registrar()).rejects.toMatchObject({ status: 422 });
      expect(await prisma.asistenciaDocente.count()).toBe(0);
    },
  );

  it("rechaza una clase cuya franja ya terminó", async () => {
    const tarde = new Date(`${hoy}T23:30:00-03:00`);
    await expect(registrar({}, tarde)).rejects.toMatchObject({ status: 422 });
    expect(await prisma.asistenciaDocente.count()).toBe(0);
  });

  it("rechaza una clase que no es de hoy", async () => {
    const manana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const otra = await createClase(institution, fixture, fechaArgentina(manana), "19:00", "23:00");
    await expect(registrar({ claseId: otra.id })).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza un docente ajeno a la comisión", async () => {
    const ajeno = await createUserWithPerfil(institution, "DOCENTE");
    await expect(registrar({ docenteId: ajeno.userId })).rejects.toMatchObject({ status: 422 });
    expect(await prisma.asistenciaDocente.count()).toBe(0);
  });

  it("rechaza una hora de llegada futura", async () => {
    await expect(registrar({ horaLlegada: "20:31" })).rejects.toMatchObject({
      status: 422,
      message: "La hora de llegada no puede ser posterior a la hora actual.",
    });
  });

  it("no cambia nada si la clase no existe", async () => {
    await expect(registrar({ claseId: "inexistente" })).rejects.toMatchObject({ status: 404 });
  });

  it("es todo o nada: si falla la creación de la asistencia se revierte el cambio de estado y su auditoría", async () => {
    const registrante = { ...bedel(), userId: "usuario-inexistente" };
    await expect(
      asOrganization(institution, () => registrarAsistenciaManual(registrante, registro(), ahora)),
    ).rejects.toBeInstanceOf(Error);
    const clase = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } });
    expect(clase.estado).toBe("PROGRAMADA");
    expect(await prisma.asistenciaDocente.count()).toBe(0);
    expect(await countAuditLogs(institution.organizationId, "ClaseProgramada")).toBe(0);
    expect(await countAuditLogs(institution.organizationId, "AsistenciaDocente")).toBe(0);
  });

  it("no deja registrar la clase de otra institución", async () => {
    const otra = await createOrganization();
    await expect(
      asOrganization(otra, () => registrarAsistenciaManual(authOf(otra, otra), registro(), ahora)),
    ).rejects.toMatchObject({ status: 404 });
    expect(await prisma.asistenciaDocente.count()).toBe(0);
    const clase = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } });
    expect(clase.estado).toBe("PROGRAMADA");
  });

  it.each(["DOCENTE", "ESTUDIANTE", "AUTORIDAD"] as const)(
    "rechaza al perfil %s y audita el acceso denegado",
    async (perfil) => {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(
        asOrganization(institution, () =>
          registrarAsistenciaManual(authOf(institution, usuario), registro(), ahora),
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(await prisma.asistenciaDocente.count()).toBe(0);
      expect(await countAuditLogs(institution.organizationId, "Permiso")).toBe(1);
    },
  );
});

describe("asistencia en el detalle de la clase", () => {
  it("la ven Bedel y Autoridad; Docente y Estudiante no", async () => {
    await registrar();
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const detalle = (auth = bedel()) =>
      asOrganization(institution, () => obtenerClase(auth, claseId));

    expect((await detalle()).asistencia).toMatchObject({ metodo: "MANUAL", horaLlegada: "19:05" });
    expect((await detalle(authOf(institution, autoridad))).asistencia?.motivo).toBe(
      "Teléfono sin batería",
    );
    expect((await detalle(authOf(institution, estudiante))).asistencia).toBeNull();
    expect((await detalle(authOf(institution, fixture.docente))).asistencia).toBeNull();
  });
});
