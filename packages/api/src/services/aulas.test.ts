import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
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
  actualizarAula,
  crearAula,
  darDeBajaAula,
  listarAulasDisponibles,
  listarAulasGestion,
  obtenerAula,
  reactivarAula,
} from "./aulas";

let institution: TestOrganization;
let fixture: AcademicFixture;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("aulas disponibles", () => {
  it("excluye las ocupadas en la franja, las fuera de servicio y las inactivas; ordena por capacidad", async () => {
    const clase = await createClase(institution, fixture, "2026-10-14");
    const ids = async () =>
      (await listarAulasDisponibles(institution.organizationId, [clase.id])).map(
        (aula) => aula.codigo,
      );
    // El aula actual de la clase no cuenta como ocupada por la propia clase.
    expect(await ids()).toEqual(["Aula 7", "Aula 12"]);

    await createClase(institution, fixture, "2026-10-14", "22:00", "23:30", fixture.otraAulaId);
    expect(await ids()).toEqual(["Aula 12"]);

    await prisma.aula.update({
      where: { id: fixture.aulaId },
      data: { estado: "FUERA_DE_SERVICIO" },
    });
    expect(await ids()).toEqual([]);
    await expect(
      listarAulasDisponibles(institution.organizationId, ["no-existe"]),
    ).rejects.toMatchObject({
      status: 404,
    });
  });
});

const nueva = { codigo: "Aula 99", edificio: "Edificio A", piso: "PB", capacidad: 35 } as const;
const crear = (datos: Partial<Parameters<typeof crearAula>[1]> = {}) =>
  crearAula(institution.organizationId, {
    ...nueva,
    equipamiento: [],
    estado: "DISPONIBLE",
    ...datos,
  });
const hoy = () => new Date().toISOString().slice(0, 10);

describe("gestión de aulas", () => {
  it("da de alta con defaults, la lista y rechaza un código repetido", async () => {
    const creada = await crear({ equipamiento: ["Proyector"] });
    expect(creada).toMatchObject({ codigo: "Aula 99", estado: "DISPONIBLE", activa: true });
    const codigos = (await listarAulasGestion(institution.organizationId, false)).map(
      (aula) => aula.codigo,
    );
    expect(codigos).toEqual(["Aula 12", "Aula 7", "Aula 99"]);
    await expect(crear()).rejects.toMatchObject({ status: 409 });
    await expect(
      actualizarAula(institution.organizationId, creada.id, { codigo: "Aula 7" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await actualizarAula(institution.organizationId, creada.id, { codigo: "Aula 99" }),
    ).toMatchObject({ codigo: "Aula 99" });
  });

  it("edita datos y estado, y 404 para un aula de otra institución", async () => {
    const aula = await crear();
    const editada = await actualizarAula(institution.organizationId, aula.id, {
      capacidad: 40,
      estado: "EN_MANTENIMIENTO",
      observaciones: "Pintura",
    });
    expect(editada).toMatchObject({
      capacidad: 40,
      estado: "EN_MANTENIMIENTO",
      observaciones: "Pintura",
    });
    const otra = await createOrganization();
    await expect(obtenerAula(otra.organizationId, aula.id)).rejects.toMatchObject({ status: 404 });
  });

  it("figura Ocupada solo con una clase en curso presencial que no está suspendida, ausente ni virtual", async () => {
    const ocupada = async () =>
      (await listarAulasGestion(institution.organizationId, false)).find(
        (aula) => aula.id === fixture.aulaId,
      )?.ocupada;
    const ahora = Date.now();
    const clase = await prisma.claseProgramada.create({
      data: {
        organizationId: institution.organizationId,
        comisionId: fixture.comisionId,
        fecha: new Date(`${hoy()}T00:00:00Z`),
        inicio: new Date(ahora - 30 * 60_000),
        fin: new Date(ahora + 30 * 60_000),
        aulaId: fixture.aulaId,
      },
    });
    expect(await ocupada()).toBe(true);
    for (const estado of ["SUSPENDIDA", "AUSENTE", "VIRTUAL"] as const) {
      await prisma.claseProgramada.update({ where: { id: clase.id }, data: { estado } });
      expect(await ocupada()).toBe(false);
    }
    await prisma.claseProgramada.update({
      where: { id: clase.id },
      data: { estado: "DEMORADA", modalidad: "VIRTUAL" },
    });
    expect(await ocupada()).toBe(false);
    await prisma.claseProgramada.update({
      where: { id: clase.id },
      data: { estado: "DOCENTE_PRESENTE", modalidad: "PRESENCIAL" },
    });
    expect(await ocupada()).toBe(true);
    expect((await obtenerAula(institution.organizationId, fixture.aulaId)).ocupada).toBe(true);
  });

  it("el detalle lista las clases de hoy a 7 días y las afectadas sin terminar", async () => {
    const dia = (desplazamiento: number) =>
      new Date(Date.now() + desplazamiento * 86_400_000).toISOString().slice(0, 10);
    const hoyClase = await createClase(institution, fixture, dia(0), "23:00", "23:59");
    const proxima = await createClase(institution, fixture, dia(7), "10:00", "11:00");
    const lejana = await createClase(institution, fixture, dia(20), "10:00", "11:00");
    const pasada = await createClase(institution, fixture, dia(-3), "10:00", "11:00");
    await createClase(institution, fixture, dia(2), "10:00", "11:00", fixture.otraAulaId);
    const suspendida = await createClase(institution, fixture, dia(3), "10:00", "11:00");
    await prisma.claseProgramada.update({
      where: { id: suspendida.id },
      data: { estado: "SUSPENDIDA" },
    });

    const detalle = await obtenerAula(institution.organizationId, fixture.aulaId);
    expect(detalle.clases.map((clase) => clase.id)).toEqual(
      [hoyClase, suspendida, proxima].map((clase) => clase.id),
    );
    expect(detalle.clases[0]).toMatchObject({ materia: "Proyecto Final", comision: "5K2" });
    expect(detalle.clasesAfectadas.map((clase) => clase.id)).toEqual(
      [hoyClase, proxima, lejana].map((clase) => clase.id),
    );
    expect(detalle.clasesAfectadas.map((clase) => clase.id)).not.toContain(pasada.id);
  });

  it("la baja conserva el código reservado, saca el aula del listado y se reactiva", async () => {
    const aula = await crear();
    const baja = await darDeBajaAula(institution.organizationId, aula.id);
    expect(baja.activa).toBe(false);
    const ids = async (bajas: boolean) =>
      (await listarAulasGestion(institution.organizationId, bajas)).map((item) => item.id);
    expect(await ids(false)).not.toContain(aula.id);
    expect(await ids(true)).toEqual([aula.id]);
    await expect(crear()).rejects.toMatchObject({ status: 409 });
    await expect(darDeBajaAula(institution.organizationId, aula.id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      actualizarAula(institution.organizationId, aula.id, { capacidad: 10 }),
    ).rejects.toMatchObject({ status: 422 });
    expect((await reactivarAula(institution.organizationId, aula.id)).activa).toBe(true);
    await expect(reactivarAula(institution.organizationId, aula.id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("un aula no Disponible o dada de baja no se ofrece en el Cambio de aula y reaparece", async () => {
    const clase = await createClase(institution, fixture, "2026-10-14", "10:00", "11:00");
    const ofrecidas = async () =>
      (await listarAulasDisponibles(institution.organizationId, [clase.id])).map((a) => a.codigo);
    const aula = await crear();
    expect(await ofrecidas()).toContain("Aula 99");
    await actualizarAula(institution.organizationId, aula.id, { estado: "FUERA_DE_SERVICIO" });
    expect(await ofrecidas()).not.toContain("Aula 99");
    await actualizarAula(institution.organizationId, aula.id, { estado: "DISPONIBLE" });
    expect(await ofrecidas()).toContain("Aula 99");
    await darDeBajaAula(institution.organizationId, aula.id);
    expect(await ofrecidas()).not.toContain("Aula 99");
  });

  it("cada operación queda en auditoría con el usuario", async () => {
    const aula = await asOrganization(institution, async () => {
      const creada = await crear();
      await actualizarAula(institution.organizationId, creada.id, { capacidad: 20 });
      await darDeBajaAula(institution.organizationId, creada.id);
      await reactivarAula(institution.organizationId, creada.id);
      return creada;
    });
    expect(await countAuditLogs(institution.organizationId, "Aula")).toBe(4);
    const registros = await prisma.auditLog.findMany({
      where: { organizationId: institution.organizationId, entity: "Aula", entityId: aula.id },
      orderBy: { createdAt: "asc" },
    });
    expect(registros.map((registro) => registro.action)).toEqual([
      "create",
      "update",
      "update",
      "update",
    ]);
    expect(registros.every((registro) => registro.userId === institution.userId)).toBe(true);
  });
});
