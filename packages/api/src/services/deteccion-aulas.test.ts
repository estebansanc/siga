import { prisma } from "@repo/db";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { apiEnv } from "../env";
import {
  asOrganization,
  authOf,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  type TestOrganization,
} from "../test/db";

import { detectarAulasDelPlano } from "./planos";

vi.mock("../integrations/storage", () => ({
  assertStorageConfigured: vi.fn(),
  getObject: vi.fn(() =>
    Promise.resolve({ body: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" }),
  ),
}));

let institution: TestOrganization;
let planoId: string;
const fetchMock = vi.fn();

const rectangulo = [
  { x: 0.1, y: 0.1 },
  { x: 0.3, y: 0.1 },
  { x: 0.3, y: 0.3 },
  { x: 0.1, y: 0.3 },
];

const respuestaDelProveedor = (aulas: unknown[]) =>
  new Response(
    JSON.stringify({ content: [{ type: "tool_use", name: "registrar_aulas", input: { aulas } }] }),
    { status: 200 },
  );

const detectar = () =>
  asOrganization(institution, () =>
    detectarAulasDelPlano(authOf(institution, institution), planoId),
  );

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  apiEnv.deteccionAulas.anthropicApiKey = "clave-de-prueba";
  apiEnv.deteccionAulas.modelo = "haiku";
  await resetDatabase();
  institution = await createInstitution();
  const plano = await prisma.planoPiso.create({
    data: {
      organizationId: institution.organizationId,
      edificio: "Edificio A",
      piso: "2.º piso",
      imagenKey: `${institution.organizationId}/planos/uno.jpg`,
      ancho: 1200,
      alto: 800,
    },
  });
  planoId = plano.id;
});

afterEach(() => {
  apiEnv.deteccionAulas.anthropicApiKey = "";
  vi.unstubAllGlobals();
});

describe("detección de aulas del plano", () => {
  it("devuelve las aulas detectadas, con nombre nulo si no hay rótulo", async () => {
    fetchMock.mockResolvedValue(
      respuestaDelProveedor([
        { nombre: "Aula 21", confianza: 0.93, poligono: rectangulo },
        { nombre: null, confianza: 0.4, poligono: rectangulo },
      ]),
    );
    const { aulas } = await detectar();
    expect(aulas).toEqual([
      { nombre: "Aula 21", confianza: 0.93, poligono: rectangulo },
      { nombre: null, confianza: 0.4, poligono: rectangulo },
    ]);
    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(opciones.headers["x-api-key"]).toBe("clave-de-prueba");
    expect(JSON.parse(opciones.body).model).toBe("claude-haiku-5-5");
  });

  it("usa el modelo configurado", async () => {
    apiEnv.deteccionAulas.modelo = "opus";
    fetchMock.mockResolvedValue(respuestaDelProveedor([]));
    await detectar();
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).model).toBe("claude-opus-5-5");
  });

  it("503 si DETECCION_AULAS_MODELO no es haiku, sonnet ni opus, sin llamar al proveedor", async () => {
    apiEnv.deteccionAulas.modelo = "gpt";
    await expect(detectar()).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("DETECCION_AULAS_MODELO"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acota las coordenadas y descarta los recintos inválidos", async () => {
    fetchMock.mockResolvedValue(
      respuestaDelProveedor([
        {
          nombre: "Aula 22",
          confianza: 1.2,
          poligono: [
            { x: -0.1, y: 0.1 },
            { x: 1.2, y: 0.1 },
            { x: 0.5, y: 0.5 },
          ],
        },
        { nombre: "Aula 23", confianza: 0.9, poligono: rectangulo.slice(0, 2) },
      ]),
    );
    const { aulas } = await detectar();
    expect(aulas).toHaveLength(1);
    expect(aulas[0]).toMatchObject({ nombre: "Aula 22", confianza: 1 });
    expect(aulas[0]!.poligono.map((punto) => punto.x)).toEqual([0, 1, 0.5]);
  });

  it("sin aulas detectadas devuelve una lista vacía", async () => {
    fetchMock.mockResolvedValue(respuestaDelProveedor([]));
    expect(await detectar()).toEqual({ aulas: [] });
  });

  it("503 sin ANTHROPIC_API_KEY, sin llamar al proveedor", async () => {
    apiEnv.deteccionAulas.anthropicApiKey = "";
    await expect(detectar()).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("ANTHROPIC_API_KEY"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("502 si el proveedor falla, no responde o devuelve algo inválido", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(detectar()).rejects.toMatchObject({ status: 502 });
    fetchMock.mockRejectedValueOnce(new Error("red"));
    await expect(detectar()).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [] }), { status: 200 }));
    await expect(detectar()).rejects.toMatchObject({ status: 502 });
  });

  it("403 para otros perfiles y 404 si el plano es de otra organización", async () => {
    const docente = await createUserWithPerfil(institution, "DOCENTE");
    await expect(
      asOrganization(institution, () =>
        detectarAulasDelPlano(authOf(institution, docente), planoId),
      ),
    ).rejects.toMatchObject({ status: 403 });
    const otra = await createOrganization("otra");
    await expect(
      asOrganization(otra, () => detectarAulasDelPlano(authOf(otra, otra), planoId)),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
