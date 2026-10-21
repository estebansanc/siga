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

import { listarClases } from "./clases";
import { finalizarNovedad, listarNovedades, publicarNovedad } from "./novedades";

let institution: TestOrganization;
let fixture: AcademicFixture;
const manana = () => sumarDias(fechaArgentina(new Date()), 1);

const estadoDe = async (claseId: string) =>
  (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } })).estado;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("publicar novedades", () => {
  it("una Demora deja la clase Demorada, con minutos y mensaje visibles en el listado", async () => {
    const clase = await createClase(institution, fixture, manana());
    const docente = authOf(institution, fixture.docente);
    const novedad = await asOrganization(institution, () =>
      publicarNovedad(docente, {
        claseIds: [clase.id],
        tipo: "DEMORA",
        minutosDemora: 15,
        mensaje: "Arranco 19:15",
      }),
    );
    expect(novedad).toMatchObject({
      tipo: "DEMORA",
      estado: "ACTIVA",
      minutosDemora: 15,
      mensaje: "Arranco 19:15",
      publicadaPor: { id: fixture.docente.userId },
      publicadaPorBedelia: false,
      comision: { codigo: "5K2", materia: "Proyecto Final" },
      clases: [expect.objectContaining({ id: clase.id, estado: "DEMORADA" })],
    });
    const listadas = (await listarClases(docente, { ambito: "mias", fecha: manana() })).clases;
    expect(listadas[0]?.novedades).toEqual([
      expect.objectContaining({ tipo: "DEMORA", minutosDemora: 15, mensaje: "Arranco 19:15" }),
    ]);
    expect(await countAuditLogs(institution.organizationId, "Novedad")).toBe(1);
  });

  it("Ausencia, Virtual y Suspensión cambian el estado según el tipo; el bedel publica sobre cualquiera", async () => {
    const [a, b, c] = await Promise.all([
      createClase(institution, fixture, manana(), "08:00", "10:00"),
      createClase(institution, fixture, manana(), "10:00", "12:00"),
      createClase(institution, fixture, manana(), "12:00", "14:00"),
    ]);
    const bedel = authOf(institution, institution);
    const ausencia = await publicarNovedad(bedel, { claseIds: [a.id], tipo: "AUSENCIA" });
    expect(ausencia.publicadaPorBedelia).toBe(true);
    await publicarNovedad(bedel, {
      claseIds: [b.id],
      tipo: "VIRTUAL",
      enlaceVirtual: "https://meet.google.com/x",
    });
    await publicarNovedad(bedel, { claseIds: [c.id], tipo: "SUSPENSION" });
    expect([await estadoDe(a.id), await estadoDe(b.id), await estadoDe(c.id)]).toEqual([
      "AUSENTE",
      "VIRTUAL",
      "SUSPENDIDA",
    ]);
    expect(
      (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: b.id } })).modalidad,
    ).toBe("VIRTUAL");
  });

  it("una novedad cubre varias clases de la misma comisión, nunca de dos", async () => {
    const [a, b] = await Promise.all([
      createClase(institution, fixture, manana(), "08:00", "10:00"),
      createClase(institution, fixture, sumarDias(manana(), 1), "08:00", "10:00"),
    ]);
    const otraComision = await prisma.comision.create({
      data: {
        organizationId: institution.organizationId,
        materiaId: fixture.materiaId,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo: "5K1",
        turno: "NOCHE",
        anioLectivo: 2026,
      },
    });
    const ajena = await createClase(
      institution,
      { comisionId: otraComision.id, aulaId: null },
      manana(),
      "15:00",
      "16:00",
    );
    const bedel = authOf(institution, institution);
    const novedad = await publicarNovedad(bedel, { claseIds: [a.id, b.id], tipo: "SUSPENSION" });
    expect(novedad.clases.map((clase) => clase.id)).toEqual([a.id, b.id]);
    await expect(
      publicarNovedad(bedel, { claseIds: [ajena.id, a.id], tipo: "SUSPENSION" }),
    ).rejects.toMatchObject({ status: 422, message: "Elegí clases de una sola comisión" });
  });

  it("un docente no publica sobre una comisión ajena: Acceso denegado y auditoría", async () => {
    const clase = await createClase(institution, fixture, manana());
    const otro = await createUserWithPerfil(institution, "DOCENTE");
    await expect(
      publicarNovedad(authOf(institution, otro), { claseIds: [clase.id], tipo: "AUSENCIA" }),
    ).rejects.toMatchObject({ status: 403, message: "Acceso denegado" });
    expect(await prisma.auditLog.count({ where: { action: "acceso_denegado" } })).toBe(1);
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await expect(
      publicarNovedad(authOf(institution, estudiante), { claseIds: [clase.id], tipo: "AUSENCIA" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("no se publica sobre una clase finalizada, ausente o suspendida, ni una Demora sobre una Demorada", async () => {
    const ayer = sumarDias(fechaArgentina(new Date()), -1);
    const vencida = await createClase(institution, fixture, ayer);
    const bedel = authOf(institution, institution);
    await expect(
      publicarNovedad(bedel, { claseIds: [vencida.id], tipo: "DEMORA", minutosDemora: 5 }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("ya está finalizada"),
    });

    const clase = await createClase(institution, fixture, manana());
    await publicarNovedad(bedel, { claseIds: [clase.id], tipo: "DEMORA", minutosDemora: 5 });
    await expect(
      publicarNovedad(bedel, { claseIds: [clase.id], tipo: "DEMORA", minutosDemora: 10 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining("está demorada") });
    await expect(
      publicarNovedad(bedel, { claseIds: ["no-existe"], tipo: "AUSENCIA" }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("Cambio de aula reserva el aula nueva si está libre y la restituye al finalizar", async () => {
    const clase = await createClase(institution, fixture, manana());
    const ocupante = await createClase(
      institution,
      fixture,
      manana(),
      "21:00",
      "22:00",
      fixture.otraAulaId,
    );
    const bedel = authOf(institution, institution);
    await expect(
      publicarNovedad(bedel, {
        claseIds: [clase.id],
        tipo: "CAMBIO_AULA",
        aulaNuevaId: fixture.otraAulaId,
      }),
    ).rejects.toMatchObject({ status: 409, message: "El aula ya está asignada en esa franja" });

    await prisma.claseProgramada.delete({ where: { id: ocupante.id } });
    const novedad = await publicarNovedad(bedel, {
      claseIds: [clase.id],
      tipo: "CAMBIO_AULA",
      aulaNuevaId: fixture.otraAulaId,
    });
    expect(novedad.aulaNueva?.id).toBe(fixture.otraAulaId);
    const cambiada = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } });
    expect([cambiada.aulaId, cambiada.estado]).toEqual([fixture.otraAulaId, "PROGRAMADA"]);

    const finalizada = await finalizarNovedad(bedel, novedad.id);
    expect(finalizada.estado).toBe("FINALIZADA");
    expect(
      (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } })).aulaId,
    ).toBe(fixture.aulaId);
    await expect(
      publicarNovedad(bedel, {
        claseIds: [clase.id],
        tipo: "CAMBIO_AULA",
        aulaNuevaId: "no-existe",
      }),
    ).rejects.toMatchObject({ status: 422, message: "El aula elegida no está disponible" });
  });
});

describe("finalizar y listar novedades", () => {
  it("finalizar una Demora o un Virtual devuelve la clase a Programada; una Ausencia no se finaliza", async () => {
    const [a, b] = await Promise.all([
      createClase(institution, fixture, manana(), "08:00", "10:00"),
      createClase(institution, fixture, manana(), "10:00", "12:00"),
    ]);
    const docente = authOf(institution, fixture.docente);
    const demora = await publicarNovedad(docente, {
      claseIds: [a.id],
      tipo: "DEMORA",
      minutosDemora: 20,
    });
    const ausencia = await publicarNovedad(docente, { claseIds: [b.id], tipo: "AUSENCIA" });

    expect((await finalizarNovedad(docente, demora.id)).finalizadaEn).not.toBeNull();
    expect(await estadoDe(a.id)).toBe("PROGRAMADA");
    await expect(finalizarNovedad(docente, demora.id)).rejects.toMatchObject({
      status: 422,
      message: "La novedad ya está finalizada",
    });
    await expect(finalizarNovedad(docente, ausencia.id)).rejects.toMatchObject({ status: 422 });
    expect(await estadoDe(b.id)).toBe("AUSENTE");
    await expect(finalizarNovedad(docente, "no-existe")).rejects.toMatchObject({ status: 404 });
  });

  it("el docente lista las de sus comisiones; bedel y autoridad, todas; el estudiante no", async () => {
    const clase = await createClase(institution, fixture, manana());
    const docente = authOf(institution, fixture.docente);
    await publicarNovedad(docente, { claseIds: [clase.id], tipo: "DEMORA", minutosDemora: 5 });
    expect(await listarNovedades(docente, {})).toHaveLength(1);
    expect(await listarNovedades(docente, { estado: "FINALIZADA" })).toHaveLength(0);
    const otro = await createUserWithPerfil(institution, "DOCENTE");
    expect(await listarNovedades(authOf(institution, otro), {})).toHaveLength(0);
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    expect(await listarNovedades(authOf(institution, autoridad), {})).toHaveLength(1);
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await expect(listarNovedades(authOf(institution, estudiante), {})).rejects.toMatchObject({
      status: 403,
    });
  });
});
