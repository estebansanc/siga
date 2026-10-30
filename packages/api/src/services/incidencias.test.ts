import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "../env";
import {
  createReadUrl,
  createUploadUrl,
  deleteObjects,
  getObjectInfo,
} from "../integrations/storage";
import {
  asOrganization,
  authOf,
  createClase,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  countAuditLogs,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { actualizarAula, obtenerAula, listarAulasDisponibles } from "./aulas";
import {
  cambiarEstadoIncidencia,
  crearIncidencia,
  crearUrlFotoIncidencia,
  listarIncidencias,
  obtenerIncidencia,
} from "./incidencias";

vi.mock("../env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  isStorageConfigured: () => true,
}));
vi.mock("../integrations/storage", () => ({
  assertStorageConfigured: vi.fn(),
  createUploadUrl: vi.fn((key: string) => Promise.resolve(`https://r2.test/upload/${key}`)),
  createReadUrl: vi.fn((key: string) => Promise.resolve(`https://r2.test/read/${key}`)),
  getObjectInfo: vi.fn(() => Promise.resolve({ size: 800_000, contentType: "image/jpeg" })),
  deleteObjects: vi.fn(() => Promise.resolve()),
}));

let institution: TestOrganization;
let fixture: AcademicFixture;

const bedel = () => authOf(institution, institution);
const docente = () => authOf(institution, fixture.docente);

const reporte = (datos: Partial<Parameters<typeof crearIncidencia>[1]> = {}) => ({
  aulaId: fixture.aulaId,
  elemento: "PROYECTOR" as const,
  descripcion: "No enciende",
  gravedad: "LEVE" as const,
  ...datos,
});

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("reportar una incidencia", () => {
  it("nace Abierta con quién reportó y su primer estado en el historial", async () => {
    const creada = await asOrganization(institution, () => crearIncidencia(bedel(), reporte()));
    expect(creada).toMatchObject({
      estado: "ABIERTA",
      descripcion: "No enciende",
      tieneFoto: false,
      aula: { codigo: "Aula 12", estado: "DISPONIBLE" },
      reportadaPor: { id: institution.userId },
    });

    const detalle = await obtenerIncidencia(bedel(), creada.id);
    expect(detalle.historial).toMatchObject([
      { estado: "ABIERTA", observaciones: null, usuario: { id: institution.userId } },
    ]);
    expect(await countAuditLogs(institution.organizationId, "Incidencia")).toBeGreaterThan(0);
  });

  it("el Docente reporta desde una clase suya con esa aula", async () => {
    const clase = await createClase(institution, fixture, "2099-10-14");
    const creada = await crearIncidencia(docente(), reporte({ claseId: clase.id }));
    expect(creada.reportadaPor.id).toBe(fixture.docente.userId);
  });

  it("el Docente no reporta sin clase, con una clase de otra aula ni de otro docente", async () => {
    const clase = await createClase(institution, fixture, "2099-10-14");
    const otraAula = await createClase(
      institution,
      fixture,
      "2099-10-15",
      "08:00",
      "10:00",
      fixture.otraAulaId,
    );
    const otroDocente = await createUserWithPerfil(institution, "DOCENTE");

    await expect(crearIncidencia(docente(), reporte())).rejects.toMatchObject({ status: 403 });
    await expect(
      crearIncidencia(docente(), reporte({ claseId: otraAula.id })),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      crearIncidencia(authOf(institution, otroDocente), reporte({ claseId: clase.id })),
    ).rejects.toMatchObject({ status: 403 });
    expect(await prisma.incidencia.count()).toBe(0);
  });

  it("Estudiante y Autoridad no reportan", async () => {
    for (const perfil of ["ESTUDIANTE", "AUTORIDAD"] as const) {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(crearIncidencia(authOf(institution, usuario), reporte())).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it("no reporta sobre aulas de otra organización ni dadas de baja", async () => {
    const ajena = await createOrganization();
    const aulaAjena = await prisma.aula.create({
      data: {
        organizationId: ajena.organizationId,
        codigo: "X",
        edificio: "E",
        piso: "1",
        capacidad: 10,
      },
    });
    await expect(crearIncidencia(bedel(), reporte({ aulaId: aulaAjena.id }))).rejects.toMatchObject(
      { status: 404 },
    );
    await prisma.aula.update({ where: { id: fixture.aulaId }, data: { activa: false } });
    await expect(crearIncidencia(bedel(), reporte())).rejects.toMatchObject({ status: 404 });
  });
});

describe("foto de la incidencia", () => {
  it("firma una URL de subida bajo el prefijo de la organización y del usuario", async () => {
    const { key, uploadUrl } = await crearUrlFotoIncidencia(bedel(), {
      contentType: "image/jpeg",
      size: 500_000,
    });
    expect(key).toMatch(
      new RegExp(`^${institution.organizationId}/incidencias/${institution.userId}/.+\\.jpg$`),
    );
    expect(uploadUrl).toContain(key);
    expect(createUploadUrl).toHaveBeenCalledWith(key, "image/jpeg", 500_000);
  });

  it("guarda la foto subida y el detalle devuelve su URL de lectura", async () => {
    const { key } = await crearUrlFotoIncidencia(bedel(), { contentType: "image/png", size: 1000 });
    const creada = await crearIncidencia(bedel(), reporte({ fotoKey: key }));
    expect(creada.tieneFoto).toBe(true);
    const detalle = await obtenerIncidencia(bedel(), creada.id);
    expect(detalle.fotoUrl).toBe(`https://r2.test/read/${key}`);
    expect(createReadUrl).toHaveBeenCalledWith(key);
  });

  it("rechaza una foto de otro usuario, ausente en el bucket o de más de 1 MB", async () => {
    await expect(
      crearIncidencia(bedel(), reporte({ fotoKey: "otra-org/incidencias/x/f.jpg" })),
    ).rejects.toMatchObject({ status: 422 });

    const { key } = await crearUrlFotoIncidencia(bedel(), { contentType: "image/jpeg", size: 10 });
    vi.mocked(getObjectInfo).mockResolvedValueOnce(null);
    await expect(crearIncidencia(bedel(), reporte({ fotoKey: key }))).rejects.toMatchObject({
      status: 422,
      message: "No se pudo subir la foto. Probá de nuevo.",
    });
    vi.mocked(getObjectInfo).mockResolvedValueOnce({
      size: 1024 * 1024 + 1,
      contentType: "image/png",
    });
    await expect(crearIncidencia(bedel(), reporte({ fotoKey: key }))).rejects.toMatchObject({
      status: 422,
    });
    vi.mocked(getObjectInfo).mockResolvedValueOnce({ size: 1000, contentType: "application/pdf" });
    await expect(crearIncidencia(bedel(), reporte({ fotoKey: key }))).rejects.toMatchObject({
      status: 422,
      message: "La foto debe ser JPG o PNG de hasta 1 MB",
    });
    expect(deleteObjects).toHaveBeenCalledWith([key]);
    expect(await prisma.incidencia.count()).toBe(0);
  });
});

describe("listado y detalle de bedelía", () => {
  it("por defecto lista Abiertas y En curso, recientes primero, y filtra por estado", async () => {
    const primera = await crearIncidencia(bedel(), reporte({ descripcion: "Primera" }));
    const segunda = await crearIncidencia(bedel(), reporte({ descripcion: "Segunda" }));
    const tercera = await crearIncidencia(bedel(), reporte({ descripcion: "Tercera" }));
    await cambiarEstadoIncidencia(bedel(), segunda.id, {
      estado: "EN_CURSO",
      rehabilitarAula: false,
    });
    await cambiarEstadoIncidencia(bedel(), segunda.id, {
      estado: "RESUELTA",
      rehabilitarAula: false,
    });
    await cambiarEstadoIncidencia(bedel(), tercera.id, {
      estado: "EN_CURSO",
      rehabilitarAula: false,
    });

    const descripciones = async () =>
      (await listarIncidencias(bedel())).map((incidencia) => incidencia.descripcion);
    expect(await descripciones()).toEqual(["Tercera", "Primera"]);
    expect(primera.estado).toBe("ABIERTA");
  });

  it("el Docente no lista ni ve el detalle ni cambia el estado; la Autoridad solo lee", async () => {
    const creada = await crearIncidencia(bedel(), reporte());
    for (const accion of [
      () => listarIncidencias(docente()),
      () => obtenerIncidencia(docente(), creada.id),
      () =>
        cambiarEstadoIncidencia(docente(), creada.id, {
          estado: "EN_CURSO",
          rehabilitarAula: false,
        }),
    ]) {
      await expect(accion()).rejects.toMatchObject({ status: 403 });
    }
    const autoridad = authOf(institution, await createUserWithPerfil(institution, "AUTORIDAD"));
    expect(await listarIncidencias(autoridad)).toHaveLength(1);
    expect((await obtenerIncidencia(autoridad, creada.id)).id).toBe(creada.id);
    await expect(
      cambiarEstadoIncidencia(autoridad, creada.id, { estado: "EN_CURSO", rehabilitarAula: false }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(crearIncidencia(autoridad, reporte())).rejects.toMatchObject({ status: 403 });
    await expect(obtenerIncidencia(bedel(), "no-existe")).rejects.toMatchObject({ status: 404 });
  });

  it("no muestra incidencias de otra organización", async () => {
    const creada = await crearIncidencia(bedel(), reporte());
    const ajena = await createOrganization();
    await expect(obtenerIncidencia(authOf(ajena, ajena), creada.id)).rejects.toMatchObject({
      status: 404,
    });
    expect(await listarIncidencias(authOf(ajena, ajena))).toEqual([]);
  });
});

describe("cambio de estado", () => {
  const avanzar = (id: string, estado: "EN_CURSO" | "RESUELTA", observaciones?: string) =>
    cambiarEstadoIncidencia(bedel(), id, { estado, observaciones, rehabilitarAula: false });

  it("avanza Abierta, En curso y Resuelta con observaciones en el historial", async () => {
    const { id } = await crearIncidencia(bedel(), reporte());
    await avanzar(id, "EN_CURSO", "Llamé al técnico");
    const detalle = await avanzar(id, "RESUELTA", "Cambiaron la lámpara");

    expect(detalle.estado).toBe("RESUELTA");
    expect(detalle.historial.map((cambio) => [cambio.estado, cambio.observaciones])).toEqual([
      ["ABIERTA", null],
      ["EN_CURSO", "Llamé al técnico"],
      ["RESUELTA", "Cambiaron la lámpara"],
    ]);
    expect(detalle.historial.every((cambio) => cambio.usuario.id === institution.userId)).toBe(
      true,
    );
  });

  it("no retrocede, no saltea y Resuelta es final", async () => {
    const { id } = await crearIncidencia(bedel(), reporte());
    await expect(avanzar(id, "RESUELTA")).rejects.toMatchObject({ status: 409 });
    await avanzar(id, "EN_CURSO");
    await expect(avanzar(id, "EN_CURSO")).rejects.toMatchObject({ status: 409 });
    await avanzar(id, "RESUELTA");
    await expect(avanzar(id, "RESUELTA")).rejects.toMatchObject({
      status: 409,
      message: "La incidencia ya está resuelta",
    });
    await expect(
      cambiarEstadoIncidencia(bedel(), id, { estado: "ABIERTA", rehabilitarAula: false }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await obtenerIncidencia(bedel(), id)).historial).toHaveLength(3);
  });
});

describe("incidencias y aula", () => {
  it("al resolver puede rehabilitar el aula Fuera de servicio, que antes no se ofrece en Cambio de aula", async () => {
    const clase = await createClase(institution, fixture, "2099-10-14", "08:00", "10:00", null);
    const { id } = await crearIncidencia(bedel(), reporte({ gravedad: "IMPIDE_USO" }));

    await actualizarAula(institution.organizationId, fixture.aulaId, {
      estado: "FUERA_DE_SERVICIO",
    });
    const ofrecidas = async () =>
      (await listarAulasDisponibles(institution.organizationId, [clase.id])).map((a) => a.codigo);
    expect(await ofrecidas()).not.toContain("Aula 12");

    await cambiarEstadoIncidencia(bedel(), id, { estado: "EN_CURSO", rehabilitarAula: false });
    await expect(
      cambiarEstadoIncidencia(bedel(), id, { estado: "EN_CURSO", rehabilitarAula: true }),
    ).rejects.toMatchObject({ status: 409 });
    const resuelta = await cambiarEstadoIncidencia(bedel(), id, {
      estado: "RESUELTA",
      rehabilitarAula: true,
    });
    expect(resuelta.aula.estado).toBe("DISPONIBLE");
    expect(await ofrecidas()).toContain("Aula 12");
  });

  it("rehabilitar solo se admite al resolver", async () => {
    const { id } = await crearIncidencia(bedel(), reporte());
    await expect(
      cambiarEstadoIncidencia(bedel(), id, { estado: "EN_CURSO", rehabilitarAula: true }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("resolver sin rehabilitar deja el aula como estaba", async () => {
    await prisma.aula.update({
      where: { id: fixture.aulaId },
      data: { estado: "FUERA_DE_SERVICIO" },
    });
    const { id } = await crearIncidencia(bedel(), reporte({ gravedad: "IMPIDE_USO" }));
    await cambiarEstadoIncidencia(bedel(), id, { estado: "EN_CURSO", rehabilitarAula: false });
    const resuelta = await cambiarEstadoIncidencia(bedel(), id, {
      estado: "RESUELTA",
      rehabilitarAula: false,
    });
    expect(resuelta.aula.estado).toBe("FUERA_DE_SERVICIO");
  });

  it("el detalle del aula lista sus incidencias, recientes primero", async () => {
    await crearIncidencia(bedel(), reporte({ descripcion: "Vieja" }));
    await crearIncidencia(bedel(), reporte({ descripcion: "Nueva", elemento: "ILUMINACION" }));
    await crearIncidencia(bedel(), reporte({ aulaId: fixture.otraAulaId, descripcion: "Otra" }));

    const aula = await obtenerAula(institution.organizationId, fixture.aulaId);
    expect(aula.incidencias.map((incidencia) => incidencia.descripcion)).toEqual([
      "Nueva",
      "Vieja",
    ]);
  });
});
