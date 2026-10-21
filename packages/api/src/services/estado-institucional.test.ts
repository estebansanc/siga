import { prisma } from "@repo/db";
import { fechaArgentina, sumarDias } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
  authOf,
  countAuditLogs,
  createClase,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { cambiarEstado, listarHistorial, obtenerEstadoActual } from "./estado-institucional";

let institution: TestOrganization;
let fixture: AcademicFixture;
const hoy = () => fechaArgentina(new Date());

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("estado institucional", () => {
  it("sin registros se asume Abierta y el historial está vacío", async () => {
    expect(await obtenerEstadoActual(institution.organizationId)).toMatchObject({
      id: null,
      estado: "ABIERTA",
      usuario: null,
    });
    expect(await listarHistorial(institution.organizationId)).toEqual([]);
  });

  it("registra el cambio con usuario y motivo, lo deja vigente y conserva el historial", async () => {
    const auth = authOf(institution, institution);
    const cambio = await asOrganization(institution, () =>
      cambiarEstado(auth, { estado: "ABIERTA_CON_NOVEDADES", motivo: "Paro de transporte" }),
    );
    expect(cambio.estado).toMatchObject({
      estado: "ABIERTA_CON_NOVEDADES",
      motivo: "Paro de transporte",
      usuario: { id: institution.userId },
    });
    expect(cambio.clasesSuspendidas).toBe(0);
    await cambiarEstado(auth, { estado: "ABIERTA" });
    expect((await obtenerEstadoActual(institution.organizationId)).estado).toBe("ABIERTA");
    expect((await listarHistorial(institution.organizationId)).map((item) => item.estado)).toEqual([
      "ABIERTA",
      "ABIERTA_CON_NOVEDADES",
    ]);
    expect(await countAuditLogs(institution.organizationId, "EstadoInstitucional")).toBe(1);
  });

  it("rechaza el mismo estado que el vigente y una vigencia pasada", async () => {
    const auth = authOf(institution, institution);
    await expect(cambiarEstado(auth, { estado: "ABIERTA" })).rejects.toMatchObject({
      status: 422,
      message: "Ese ya es el estado actual",
    });
    await expect(
      cambiarEstado(auth, {
        estado: "CERRADA",
        motivo: "x",
        vigenciaHasta: "2020-01-01T00:00:00Z",
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("solo el Bedel cambia el estado", async () => {
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    await expect(
      cambiarEstado(authOf(institution, autoridad), { estado: "CERRADA", motivo: "Paro" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("al cerrar suspende las clases de hoy que no terminaron, no las finales ni las de otro día", async () => {
    const enCurso = await createClase(institution, fixture, hoy(), "00:00", "23:59");
    const demorada = await createClase(institution, fixture, hoy(), "00:01", "23:58");
    await prisma.claseProgramada.update({
      where: { id: demorada.id },
      data: { estado: "DEMORADA" },
    });
    const ausente = await createClase(institution, fixture, hoy(), "00:02", "23:57");
    await prisma.claseProgramada.update({ where: { id: ausente.id }, data: { estado: "AUSENTE" } });
    const manana = await createClase(institution, fixture, sumarDias(hoy(), 1));

    const cambio = await cambiarEstado(authOf(institution, institution), {
      estado: "CERRADA",
      motivo: "Corte de energía",
    });
    expect(cambio.clasesSuspendidas).toBe(2);
    const estados = Object.fromEntries(
      (await prisma.claseProgramada.findMany()).map((clase) => [clase.id, clase.estado]),
    );
    expect(estados).toEqual({
      [enCurso.id]: "SUSPENDIDA",
      [demorada.id]: "SUSPENDIDA",
      [ausente.id]: "AUSENTE",
      [manana.id]: "PROGRAMADA",
    });
    expect(
      await prisma.auditLog.findFirst({ where: { action: "suspender_por_cierre" } }),
    ).toMatchObject({ entity: "ClaseProgramada" });
  });

  it("con vigencia, el cierre alcanza las clases hasta esa hora aunque sean de mañana", async () => {
    const manana = sumarDias(hoy(), 1);
    const clase = await createClase(institution, fixture, manana, "08:00", "10:00");
    const cambio = await cambiarEstado(authOf(institution, institution), {
      estado: "CERRADA",
      motivo: "Paro",
      vigenciaHasta: `${manana}T12:00:00-03:00`,
    });
    expect(cambio.clasesSuspendidas).toBe(1);
    expect(
      (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } })).estado,
    ).toBe("SUSPENDIDA");
  });
});
