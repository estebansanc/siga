import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  countAuditLogs,
  createClase,
  createInstitution,
  createOrganization,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import {
  aprobarSolicitudAula,
  asignarAulaAClaseSinAula,
  listarClasesSinAula,
  listarSolicitudesAulaPorEstado,
  reasignarSolicitudAula,
  rechazarSolicitudAula,
} from "./asignacion-aulas";
import { publicarNovedad } from "./novedades";
import { crearSolicitudAula } from "./solicitudes-aula";

const fecha = "2026-10-14";
const ahora = new Date(`${fecha}T10:00:00-03:00`);
const ocupada = {
  status: 409,
  message: expect.stringContaining("El aula ya está asignada en esa franja"),
};

let institution: TestOrganization;
let fixture: AcademicFixture;
let terceraAulaId: string;

const bedel = () => authOf(institution, institution);
const docente = () => authOf(institution, fixture.docente);

const solicitarPendiente = async (aulaId = fixture.otraAulaId, inicio = "11:00") => {
  const clase = await createClase(institution, fixture, fecha, inicio, "13:00");
  const solicitud = await crearSolicitudAula(
    docente(),
    { claseId: clase.id, aulaId, alumnos: 30, recursos: [] },
    ahora,
  );
  return { clase, solicitud };
};

const aulaDe = async (claseId: string) =>
  (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } })).aulaId;
const novedades = () => prisma.novedad.findMany({ include: { clases: true } });
const correos = () => prisma.emailOutbox.findMany({ orderBy: { createdAt: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  terceraAulaId = (
    await prisma.aula.create({
      data: {
        organizationId: institution.organizationId,
        codigo: "Aula 3",
        edificio: "Edificio B",
        piso: "PB",
        capacidad: 40,
        equipamiento: [],
      },
    })
  ).id;
});

describe("aprobar solicitud", () => {
  it("la clase toma el aula elegida, publica un Cambio de aula y avisa al docente", async () => {
    const { clase, solicitud } = await solicitarPendiente();

    const aprobada = await aprobarSolicitudAula(
      bedel(),
      solicitud.id,
      { aulaId: terceraAulaId },
      ahora,
    );

    expect(aprobada).toMatchObject({ estado: "APROBADA", aula: { codigo: "Aula 3" } });
    expect(aprobada.clase.aula?.codigo).toBe("Aula 3");
    expect(await aulaDe(clase.id)).toBe(terceraAulaId);
    const [novedad] = await novedades();
    expect(novedad).toMatchObject({
      tipo: "CAMBIO_AULA",
      aulaNuevaId: terceraAulaId,
      publicadaPorBedelia: true,
    });
    expect(novedad?.clases[0]).toMatchObject({ claseId: clase.id, aulaAnteriorId: fixture.aulaId });
    const registrada = await prisma.solicitudAula.findUniqueOrThrow({
      where: { id: solicitud.id },
    });
    expect(registrada).toMatchObject({ resueltaPorId: institution.userId });
    expect(registrada.resueltaEn).toEqual(ahora);
    const [correo] = await correos();
    expect(correo).toMatchObject({ to: fixture.docente.userEmail, status: "PENDING" });
    expect(correo?.subject).toBe("Solicitud de aula aprobada: Proyecto Final 5K2");
    expect(correo?.html).toContain("Aula 3");
    expect(await countAuditLogs(institution.organizationId, "SolicitudAula")).toBe(1);
  });

  it("sobre una clase sin aula no publica novedad", async () => {
    const clase = await createClase(institution, fixture, fecha, "11:00", "13:00", null);
    const solicitud = await crearSolicitudAula(
      docente(),
      { claseId: clase.id, aulaId: fixture.aulaId, alumnos: 30, recursos: [] },
      ahora,
    );

    await aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: fixture.aulaId }, ahora);

    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(await novedades()).toHaveLength(0);
    expect(await correos()).toHaveLength(1);
  });

  it("si el aula se ocupó responde 409 y no cambia nada", async () => {
    const { clase, solicitud } = await solicitarPendiente();
    await prisma.claseProgramada.update({
      where: { id: (await createClase(institution, fixture, fecha, "12:00", "14:00", null)).id },
      data: { aulaId: terceraAulaId },
    });

    await expect(
      aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject(ocupada);

    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(
      (await prisma.solicitudAula.findUniqueOrThrow({ where: { id: solicitud.id } })).estado,
    ).toBe("PENDIENTE");
    expect(await novedades()).toHaveLength(0);
    expect(await correos()).toHaveLength(0);
  });

  it("dos aprobaciones simultáneas: una sola prospera", async () => {
    const { solicitud } = await solicitarPendiente();

    const resultados = await Promise.allSettled([
      aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: terceraAulaId }, ahora),
      aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: fixture.otraAulaId }, ahora),
    ]);

    expect(resultados.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resultados.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { status: 409, message: "La solicitud ya no está pendiente" },
    });
    expect(await novedades()).toHaveLength(1);
    expect(await correos()).toHaveLength(1);
  });

  it("rechaza aulas no disponibles, clases terminadas y a quien no es bedel", async () => {
    const { solicitud } = await solicitarPendiente();
    await prisma.aula.update({
      where: { id: terceraAulaId },
      data: { estado: "EN_MANTENIMIENTO" },
    });
    await expect(
      aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject({ status: 422, message: "El aula no está disponible" });
    await expect(
      aprobarSolicitudAula(docente(), solicitud.id, { aulaId: fixture.aulaId }, ahora),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      aprobarSolicitudAula(
        bedel(),
        solicitud.id,
        { aulaId: fixture.aulaId },
        new Date(`${fecha}T14:00:00-03:00`),
      ),
    ).rejects.toMatchObject({ status: 422, message: "La clase ya no admite asignación de aula" });
    expect(
      (await prisma.solicitudAula.findUniqueOrThrow({ where: { id: solicitud.id } })).estado,
    ).toBe("PENDIENTE");
  });
});

describe("rechazar solicitud", () => {
  it("guarda el motivo, deja la clase como estaba y avisa con aula pedida y motivo", async () => {
    const { clase, solicitud } = await solicitarPendiente();

    const rechazada = await rechazarSolicitudAula(
      bedel(),
      solicitud.id,
      { motivo: "Hay obras" },
      ahora,
    );

    expect(rechazada).toMatchObject({ estado: "RECHAZADA", motivoRechazo: "Hay obras" });
    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(await novedades()).toHaveLength(0);
    const [correo] = await correos();
    expect(correo?.subject).toBe("Solicitud de aula rechazada: Proyecto Final 5K2");
    expect(correo?.html).toContain("Hay obras");
    expect(correo?.html).toContain("Aula 7");
  });

  it("una Asignada o ya resuelta responde 409", async () => {
    const asignada = await createClase(institution, fixture, fecha, "10:10", "12:00", null);
    const inmediata = await crearSolicitudAula(
      bedel(),
      { claseId: asignada.id, aulaId: fixture.aulaId, alumnos: 20, recursos: [] },
      ahora,
    );
    await expect(
      rechazarSolicitudAula(bedel(), inmediata.id, { motivo: "No" }, ahora),
    ).rejects.toMatchObject({ status: 409 });

    const { solicitud } = await solicitarPendiente();
    await rechazarSolicitudAula(bedel(), solicitud.id, { motivo: "No" }, ahora);
    await expect(
      rechazarSolicitudAula(bedel(), solicitud.id, { motivo: "Otra vez" }, ahora),
    ).rejects.toMatchObject({ status: 409, message: "La solicitud ya no está pendiente" });
    await expect(
      rechazarSolicitudAula(bedel(), "inexistente", { motivo: "No" }, ahora),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("reasignar solicitud", () => {
  const solicitarInmediata = async () => {
    const clase = await createClase(institution, fixture, fecha, "10:10", "12:00", null);
    const solicitud = await crearSolicitudAula(
      docente(),
      { claseId: clase.id, aulaId: fixture.aulaId, alumnos: 20, recursos: [] },
      ahora,
    );
    return { clase, solicitud };
  };

  it("cambia el aula de la clase, sigue Asignada y publica el Cambio de aula", async () => {
    const { clase, solicitud } = await solicitarInmediata();

    const reasignada = await reasignarSolicitudAula(
      bedel(),
      solicitud.id,
      { aulaId: terceraAulaId },
      ahora,
    );

    expect(reasignada).toMatchObject({ estado: "ASIGNADA", aula: { codigo: "Aula 3" } });
    expect(await aulaDe(clase.id)).toBe(terceraAulaId);
    const [novedad] = await novedades();
    expect(novedad?.clases[0]?.aulaAnteriorId).toBe(fixture.aulaId);
    const [correo] = await correos();
    expect(correo?.subject).toBe("Cambio de aula: Proyecto Final 5K2");
    expect(correo?.html).toContain("Aula 12");
    expect(correo?.html).toContain("Aula 3");
  });

  it("responde 409 si el aula se ocupó y 409 si la solicitud no está asignada", async () => {
    const { clase, solicitud } = await solicitarInmediata();
    await createClase(institution, fixture, fecha, "10:30", "11:30", terceraAulaId);

    await expect(
      reasignarSolicitudAula(bedel(), solicitud.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject(ocupada);
    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(await novedades()).toHaveLength(0);

    const { solicitud: pendiente } = await solicitarPendiente();
    await expect(
      reasignarSolicitudAula(bedel(), pendiente.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject({ status: 409, message: "La solicitud no está asignada" });
  });
});

describe("clases sin aula", () => {
  it("lista las presenciales de hoy a 7 días sin terminar ni estado final", async () => {
    const vigente = await createClase(institution, fixture, fecha, "19:00", "20:00", null);
    const dentroDeSiete = await createClase(
      institution,
      fixture,
      "2026-10-21",
      "19:00",
      "20:00",
      null,
    );
    await createClase(institution, fixture, "2026-10-22", "19:00", "20:00", null);
    await createClase(institution, fixture, fecha, "06:00", "09:00", null);
    await createClase(institution, fixture, fecha, "15:00", "16:00");
    const suspendida = await createClase(institution, fixture, fecha, "16:00", "17:00", null);
    const virtual = await createClase(institution, fixture, fecha, "17:00", "18:00", null);
    await prisma.claseProgramada.update({
      where: { id: suspendida.id },
      data: { estado: "SUSPENDIDA" },
    });
    await prisma.claseProgramada.update({
      where: { id: virtual.id },
      data: { modalidad: "VIRTUAL" },
    });

    const { clases } = await listarClasesSinAula(bedel(), ahora);

    expect(clases.map(({ id }) => id)).toEqual([vigente.id, dentroDeSiete.id]);
    await expect(listarClasesSinAula(docente(), ahora)).rejects.toMatchObject({ status: 403 });
  });

  it("asignar aula la saca de la lista, no publica novedad y avisa al docente", async () => {
    const clase = await createClase(institution, fixture, fecha, "19:00", "20:00", null);

    const asignada = await asignarAulaAClaseSinAula(
      bedel(),
      clase.id,
      { aulaId: fixture.aulaId },
      ahora,
    );

    expect(asignada.aula?.codigo).toBe("Aula 12");
    expect((await listarClasesSinAula(bedel(), ahora)).clases).toHaveLength(0);
    expect(await novedades()).toHaveLength(0);
    const [correo] = await correos();
    expect(correo).toMatchObject({ to: fixture.docente.userEmail });
    expect(correo?.subject).toBe("Aula asignada: Proyecto Final 5K2");
    expect(await countAuditLogs(institution.organizationId, "ClaseProgramada")).toBeGreaterThan(0);
  });

  it("responde 409 si el aula se ocupó en la franja y no cambia nada", async () => {
    const clase = await createClase(institution, fixture, fecha, "19:00", "20:00", null);
    await createClase(institution, fixture, fecha, "19:30", "21:00", fixture.aulaId);

    await expect(
      asignarAulaAClaseSinAula(bedel(), clase.id, { aulaId: fixture.aulaId }, ahora),
    ).rejects.toMatchObject(ocupada);

    expect(await aulaDe(clase.id)).toBeNull();
    expect(await correos()).toHaveLength(0);
  });

  it("dos asignaciones simultáneas de la misma aula en la misma franja: una sola prospera", async () => {
    const primera = await createClase(institution, fixture, fecha, "19:00", "20:00", null);
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
    const segunda = await createClase(
      institution,
      { comisionId: otraComision.id, aulaId: null },
      fecha,
      "19:00",
      "20:00",
    );

    const resultados = await Promise.allSettled(
      [primera, segunda].map((clase) =>
        asignarAulaAClaseSinAula(bedel(), clase.id, { aulaId: fixture.aulaId }, ahora),
      ),
    );

    expect(resultados.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resultados.find(({ status }) => status === "rejected")).toMatchObject({
      reason: ocupada,
    });
  });

  it("rechaza una clase que ya tiene aula y una terminada", async () => {
    const conAula = await createClase(institution, fixture, fecha, "19:00", "20:00");
    await expect(
      asignarAulaAClaseSinAula(bedel(), conAula.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject({ status: 409, message: "La clase ya tiene aula asignada" });
    const terminada = await createClase(institution, fixture, fecha, "06:00", "09:00", null);
    await expect(
      asignarAulaAClaseSinAula(bedel(), terminada.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject({ status: 422, message: "La clase ya no admite asignación de aula" });
  });
});

describe("listar solicitudes", () => {
  it("separa por estado y lo ven solo los bedeles", async () => {
    const { solicitud: aRechazar } = await solicitarPendiente();
    await rechazarSolicitudAula(bedel(), aRechazar.id, { motivo: "Sin lugar" }, ahora);
    const { solicitud: pendiente } = await solicitarPendiente(fixture.otraAulaId, "11:30");

    const pendientes = await listarSolicitudesAulaPorEstado(bedel(), "PENDIENTE");
    const rechazadas = await listarSolicitudesAulaPorEstado(bedel(), "RECHAZADA");

    expect(pendientes.map(({ id }) => id)).toEqual([pendiente.id]);
    expect(pendientes[0]?.solicitante.id).toBe(fixture.docente.userId);
    expect(rechazadas[0]).toMatchObject({ id: aRechazar.id, motivoRechazo: "Sin lugar" });
    expect(await listarSolicitudesAulaPorEstado(bedel(), "APROBADA")).toEqual([]);
    await expect(listarSolicitudesAulaPorEstado(docente(), "PENDIENTE")).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("concurrencia con Cambio de aula de novedades", () => {
  it("un Cambio de aula y una asignación a la misma aula y franja: una sola prospera", async () => {
    const sinAula = await createClase(institution, fixture, "2099-10-14", "19:00", "20:00", null);
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
    const conAula = await createClase(
      institution,
      { comisionId: otraComision.id, aulaId: fixture.aulaId },
      "2099-10-14",
      "19:00",
      "20:00",
    );

    const resultados = await Promise.allSettled([
      asignarAulaAClaseSinAula(bedel(), sinAula.id, { aulaId: terceraAulaId }, ahora),
      publicarNovedad(bedel(), {
        claseIds: [conAula.id],
        tipo: "CAMBIO_AULA",
        aulaNuevaId: terceraAulaId,
      }),
    ]);

    expect(resultados.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resultados.find(({ status }) => status === "rejected")).toMatchObject({
      reason: ocupada,
    });
    const ocupantes = await prisma.claseProgramada.count({ where: { aulaId: terceraAulaId } });
    expect(ocupantes).toBe(1);
  });
});

describe("aislamiento y permisos", () => {
  it("un bedel de otra organización no ve ni resuelve nada, y un aula ajena da 404", async () => {
    const { clase, solicitud } = await solicitarPendiente();
    const sinAula = await createClase(institution, fixture, fecha, "19:00", "20:00", null);
    const otra = await createOrganization("otra");
    const ajeno = authOf(otra, otra);
    const aulaAjena = await prisma.aula.create({
      data: {
        organizationId: otra.organizationId,
        codigo: "Aula X",
        edificio: "Edificio Z",
        piso: "PB",
        capacidad: 30,
        equipamiento: [],
      },
    });

    for (const intento of [
      () => aprobarSolicitudAula(ajeno, solicitud.id, { aulaId: aulaAjena.id }, ahora),
      () => rechazarSolicitudAula(ajeno, solicitud.id, { motivo: "No" }, ahora),
      () => reasignarSolicitudAula(ajeno, solicitud.id, { aulaId: aulaAjena.id }, ahora),
      () => asignarAulaAClaseSinAula(ajeno, sinAula.id, { aulaId: aulaAjena.id }, ahora),
    ]) {
      await expect(intento()).rejects.toMatchObject({ status: 404 });
    }
    expect(await listarSolicitudesAulaPorEstado(ajeno, "PENDIENTE")).toEqual([]);
    expect((await listarClasesSinAula(ajeno, ahora)).clases).toEqual([]);

    await expect(
      aprobarSolicitudAula(bedel(), solicitud.id, { aulaId: aulaAjena.id }, ahora),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      asignarAulaAClaseSinAula(bedel(), sinAula.id, { aulaId: aulaAjena.id }, ahora),
    ).rejects.toMatchObject({ status: 404 });
    expect(await aulaDe(clase.id)).toBe(fixture.aulaId);
    expect(
      (await prisma.solicitudAula.findUniqueOrThrow({ where: { id: solicitud.id } })).estado,
    ).toBe("PENDIENTE");
  });

  it("quien no es bedel recibe 403 en rechazar, reasignar, clases sin aula y asignar", async () => {
    const { solicitud } = await solicitarPendiente();
    const sinAula = await createClase(institution, fixture, fecha, "19:00", "20:00", null);

    for (const intento of [
      () => rechazarSolicitudAula(docente(), solicitud.id, { motivo: "No" }, ahora),
      () => reasignarSolicitudAula(docente(), solicitud.id, { aulaId: terceraAulaId }, ahora),
      () => listarClasesSinAula(docente(), ahora),
      () => asignarAulaAClaseSinAula(docente(), sinAula.id, { aulaId: terceraAulaId }, ahora),
    ]) {
      await expect(intento()).rejects.toMatchObject({ status: 403 });
    }
  });

  it("no asigna aula a una clase con solicitud Pendiente", async () => {
    const { clase } = await solicitarPendiente();
    await prisma.claseProgramada.update({ where: { id: clase.id }, data: { aulaId: null } });

    await expect(
      asignarAulaAClaseSinAula(bedel(), clase.id, { aulaId: terceraAulaId }, ahora),
    ).rejects.toMatchObject({ status: 409 });
    expect(await aulaDe(clase.id)).toBeNull();
  });
});
