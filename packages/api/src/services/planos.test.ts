import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "../env";
import { isStorageConfigured } from "../env";
import { unavailable } from "../errors";
import {
  assertStorageConfigured,
  createUploadUrl,
  deleteObjects,
  getObjectInfo,
} from "../integrations/storage";
import {
  asOrganization,
  authOf,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { actualizarAula, listarPlanoAulas } from "./aulas";
import {
  crearUrlImagenPlano,
  guardarPlano,
  importarAulasDelPlano,
  listarPlanos,
  obtenerPlano,
} from "./planos";

vi.mock("../env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  isStorageConfigured: vi.fn(() => true),
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
const enOrganizacion = <T>(fn: () => Promise<T>) => asOrganization(institution, fn);

const rectangulo = (x = 0.1) => [
  { x, y: 0.1 },
  { x: x + 0.2, y: 0.1 },
  { x: x + 0.2, y: 0.3 },
  { x, y: 0.3 },
];

const keyDe = (nombre: string) => `${institution.organizationId}/planos/${nombre}.jpg`;

const plano = (datos: Partial<Parameters<typeof guardarPlano>[1]> = {}) => ({
  edificio: "Edificio A",
  piso: "1.º piso",
  key: keyDe("uno"),
  ancho: 1200,
  alto: 800,
  ...datos,
});

const guardarPlanoDelPiso = (datos: Partial<Parameters<typeof guardarPlano>[1]> = {}) =>
  enOrganizacion(() => guardarPlano(bedel(), plano(datos)));

const importar = (
  planoId: string,
  aulas: { codigo: string; capacidad?: number; x?: number }[],
  capacidadPorDefecto = 40,
) =>
  enOrganizacion(() =>
    importarAulasDelPlano(bedel(), planoId, {
      capacidadPorDefecto,
      aulas: aulas.map(({ x, ...aula }) => ({ ...aula, poligono: rectangulo(x) })),
    }),
  );

const aulaPorCodigo = (codigo: string) =>
  prisma.aula.findFirstOrThrow({ where: { organizationId: institution.organizationId, codigo } });

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("URL de subida de la imagen", () => {
  it("el Bedel recibe una clave dentro de su organización y la URL firmada", async () => {
    const subida = await enOrganizacion(() =>
      crearUrlImagenPlano(bedel(), { contentType: "image/png", size: 3_000_000 }),
    );
    expect(subida.key).toMatch(new RegExp(`^${institution.organizationId}/planos/.+\\.png$`));
    expect(subida.uploadUrl).toContain(subida.key);
    expect(createUploadUrl).toHaveBeenCalledWith(subida.key, "image/png", 3_000_000);
  });

  it("otros perfiles reciben 403", async () => {
    const docente = await createUserWithPerfil(institution, "DOCENTE");
    await expect(
      enOrganizacion(() =>
        crearUrlImagenPlano(authOf(institution, docente), {
          contentType: "image/jpeg",
          size: 1000,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("sin almacenamiento configurado responde 503", async () => {
    vi.mocked(assertStorageConfigured).mockImplementationOnce(() => {
      throw unavailable("El almacenamiento de archivos no está configurado: faltan STORAGE_BUCKET");
    });
    await expect(
      enOrganizacion(() => crearUrlImagenPlano(bedel(), { contentType: "image/jpeg", size: 1000 })),
    ).rejects.toMatchObject({ status: 503, message: expect.stringContaining("STORAGE_BUCKET") });
  });
});

describe("guardar el plano de un piso", () => {
  it("crea el plano con una URL de lectura", async () => {
    const { plano: guardado, creado } = await guardarPlanoDelPiso();
    expect(creado).toBe(true);
    expect(guardado).toMatchObject({
      edificio: "Edificio A",
      piso: "1.º piso",
      ancho: 1200,
      alto: 800,
      imagenUrl: `https://r2.test/read/${keyDe("uno")}`,
      aulasUbicadas: 0,
    });
  });

  it("422 si la imagen no está subida, es de otra organización o no es válida", async () => {
    vi.mocked(getObjectInfo).mockResolvedValueOnce(null);
    await expect(guardarPlanoDelPiso()).rejects.toMatchObject({ status: 422 });
    await expect(guardarPlanoDelPiso({ key: "otra-org/planos/x.jpg" })).rejects.toMatchObject({
      status: 422,
    });

    vi.mocked(getObjectInfo).mockResolvedValueOnce({ size: 5_000_000, contentType: "image/jpeg" });
    await expect(guardarPlanoDelPiso()).rejects.toMatchObject({ status: 422 });
    expect(deleteObjects).toHaveBeenCalledWith([keyDe("uno")]);
    expect(await prisma.planoPiso.count()).toBe(0);
  });

  it("otra imagen para el mismo piso reemplaza, borra la anterior y conserva los polígonos", async () => {
    const { plano: primero } = await guardarPlanoDelPiso();
    await importar(primero.id, [{ codigo: "Aula 12" }]);

    const { plano: segundo, creado } = await guardarPlanoDelPiso({
      key: keyDe("dos"),
      ancho: 2400,
      alto: 1600,
    });

    expect(creado).toBe(false);
    expect(segundo).toMatchObject({ id: primero.id, ancho: 2400, aulasUbicadas: 1 });
    expect(segundo.imagenUrl).toContain(keyDe("dos"));
    expect(deleteObjects).toHaveBeenCalledWith([keyDe("uno")]);
    expect(await prisma.planoPiso.count()).toBe(1);
    expect((await aulaPorCodigo("Aula 12")).poligono).toEqual(rectangulo());
  });

  it("el Bedel lista los planos y consulta uno con sus aulas ubicadas", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await guardarPlanoDelPiso({ edificio: "Edificio B", piso: "PB", key: keyDe("b") });
    await importar(guardado.id, [{ codigo: "Aula 12" }, { codigo: "Aula 16" }]);

    const lista = await enOrganizacion(() => listarPlanos(bedel()));
    expect(lista.map((p) => [p.edificio, p.aulasUbicadas])).toEqual([
      ["Edificio A", 2],
      ["Edificio B", 0],
    ]);

    const detalle = await enOrganizacion(() => obtenerPlano(bedel(), guardado.id));
    expect(detalle.aulas.map((a) => a.codigo)).toEqual(["Aula 12", "Aula 16"]);
    expect(detalle.aulas[0]).toMatchObject({ capacidad: 60, poligono: rectangulo() });
  });

  it("otros perfiles no listan ni consultan planos", async () => {
    const docente = authOf(institution, await createUserWithPerfil(institution, "DOCENTE"));
    await expect(enOrganizacion(() => listarPlanos(docente))).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("importar las aulas de un plano", () => {
  it("crea las nuevas Disponibles sin equipamiento y ubica las existentes sin cambiar su capacidad", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();

    const resultado = await importar(guardado.id, [
      { codigo: "Aula 16" },
      { codigo: "Aula 17", capacidad: 25 },
      { codigo: "Aula 12", capacidad: 999 },
    ]);

    expect(resultado.creadas.map((a) => a.codigo)).toEqual(["Aula 16", "Aula 17"]);
    expect(resultado.ubicadas.map((a) => a.codigo)).toEqual(["Aula 12"]);
    expect(await aulaPorCodigo("Aula 16")).toMatchObject({
      estado: "DISPONIBLE",
      equipamiento: [],
      capacidad: 40,
      edificio: "Edificio A",
      piso: "1.º piso",
      activa: true,
      planoId: guardado.id,
    });
    expect((await aulaPorCodigo("Aula 17")).capacidad).toBe(25);
    expect(await aulaPorCodigo("Aula 12")).toMatchObject({ capacidad: 60, planoId: guardado.id });
  });

  it("reimportar un aula ubicada deja el polígono nuevo y no duplica", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await importar(guardado.id, [{ codigo: "Aula 16" }]);

    const segunda = await importar(guardado.id, [{ codigo: "Aula 16", x: 0.5 }]);

    expect(segunda.creadas).toEqual([]);
    expect(segunda.ubicadas.map((a) => a.codigo)).toEqual(["Aula 16"]);
    expect((await aulaPorCodigo("Aula 16")).poligono).toEqual(rectangulo(0.5));
    expect(await prisma.aula.count({ where: { codigo: "Aula 16" } })).toBe(1);
  });

  it("un código de otro piso responde 409 nombrándolo y no cambia nada", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();

    await expect(
      importar(guardado.id, [{ codigo: "Aula 16" }, { codigo: "Aula 7" }]),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Aula 7") });

    expect(await prisma.aula.count({ where: { codigo: "Aula 16" } })).toBe(0);
    expect((await aulaPorCodigo("Aula 7")).planoId).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "plano_aulas_importadas" } })).toBe(0);
  });

  it("un código dado de baja responde 409", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await prisma.aula.update({ where: { id: fixture.aulaId }, data: { activa: false } });

    await expect(importar(guardado.id, [{ codigo: "Aula 12" }])).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Aula 12"),
    });
  });

  it("queda en auditoría con el plano y los códigos creados y ubicados", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await importar(guardado.id, [{ codigo: "Aula 16" }, { codigo: "Aula 12" }]);

    const fila = await prisma.auditLog.findFirstOrThrow({
      where: { action: "plano_aulas_importadas" },
    });
    expect(fila).toMatchObject({
      entity: "PlanoPiso",
      organizationId: institution.organizationId,
      after: { planoId: guardado.id, creadas: ["Aula 16"], ubicadas: ["Aula 12"] },
    });
  });

  it("solo el Bedel importa", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    const docente = authOf(institution, await createUserWithPerfil(institution, "DOCENTE"));
    await expect(
      enOrganizacion(() =>
        importarAulasDelPlano(docente, guardado.id, {
          capacidadPorDefecto: 30,
          aulas: [{ codigo: "Aula 16", poligono: rectangulo() }],
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("plano de aulas con plano y polígono", () => {
  it("suma el plano y el polígono de las ubicadas y nulos para el resto", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await importar(guardado.id, [{ codigo: "Aula 12" }]);

    const aulas = await listarPlanoAulas(institution.organizationId);

    const ubicada = aulas.find((a) => a.codigo === "Aula 12");
    expect(ubicada).toMatchObject({
      poligono: rectangulo(),
      plano: { id: guardado.id, ancho: 1200, alto: 800, imagenUrl: expect.any(String) },
    });
    expect(aulas.find((a) => a.codigo === "Aula 7")).toMatchObject({ plano: null, poligono: null });
  });

  it("sin almacenamiento configurado la vista sigue y el plano es nulo", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await importar(guardado.id, [{ codigo: "Aula 12" }]);
    vi.mocked(isStorageConfigured).mockReturnValueOnce(false);

    const aulas = await listarPlanoAulas(institution.organizationId);

    expect(aulas.find((a) => a.codigo === "Aula 12")).toMatchObject({
      plano: null,
      poligono: rectangulo(),
    });
  });

  it("cambiar el piso de un aula ubicada la desubica; cambiar otro dato no", async () => {
    const { plano: guardado } = await guardarPlanoDelPiso();
    await importar(guardado.id, [{ codigo: "Aula 12" }]);

    await actualizarAula(institution.organizationId, fixture.aulaId, { capacidad: 50 });
    expect((await aulaPorCodigo("Aula 12")).planoId).toBe(guardado.id);

    await actualizarAula(institution.organizationId, fixture.aulaId, { piso: "2.º piso" });
    expect(await aulaPorCodigo("Aula 12")).toMatchObject({ planoId: null, poligono: null });
  });
});
