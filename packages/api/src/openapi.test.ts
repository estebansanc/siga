import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type PropertySchema = { type?: unknown; enum?: unknown[] };
type BodySchema = { required?: string[]; properties: Record<string, PropertySchema> };

type OpenApiDocument = {
  components: {
    schemas: Record<string, { required?: string[]; properties: Record<string, PropertySchema> }>;
  };
  paths: Record<
    string,
    {
      get?: { parameters: { name: string; in: string }[] };
      post?: { requestBody: { content: { "application/json": { schema: BodySchema } } } };
      patch?: { requestBody: { content: { "application/json": { schema: BodySchema } } } };
    }
  >;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const openapi = JSON.parse(
  readFileSync(join(currentDir, "..", "openapi.json"), "utf-8"),
) as OpenApiDocument;

describe("openapi.json", () => {
  it("declara el rol y el perfil como enum y lostOrganization nullable en Me", () => {
    const me = openapi.components.schemas.Me;
    expect(me?.properties.role?.enum).toEqual(["owner", "member"]);
    expect(me?.properties.perfil?.enum).toEqual(["ESTUDIANTE", "DOCENTE", "BEDEL", "AUTORIDAD"]);
    expect(me?.required).toContain("lostOrganization");
  });

  it("documenta los filtros de clases como query params y el tipo de novedad como enum", () => {
    const clases = openapi.paths["/api/v1/clases"]?.get;
    expect(clases?.parameters.map((parameter) => [parameter.name, parameter.in])).toEqual([
      ["fecha", "query"],
      ["ambito", "query"],
      ["carreraId", "query"],
      ["anio", "query"],
      ["materiaId", "query"],
      ["comisionId", "query"],
    ]);
    const novedad =
      openapi.paths["/api/v1/novedades"]?.post?.requestBody.content["application/json"].schema;
    expect(novedad?.required).toEqual(["claseIds", "tipo"]);
    expect(novedad?.properties.tipo?.enum).toEqual([
      "AUSENCIA",
      "DEMORA",
      "VIRTUAL",
      "SUSPENSION",
      "CAMBIO_AULA",
    ]);
  });

  it("exige el email al invitar", () => {
    const schema =
      openapi.paths["/api/v1/invitations"]?.post?.requestBody.content["application/json"].schema;
    expect(schema?.required).toEqual(["email"]);
  });

  it("deja el nombre opcional en los ajustes", () => {
    const schema =
      openapi.paths["/api/v1/settings"]?.patch?.requestBody.content["application/json"].schema;
    expect(schema?.required).toBeUndefined();
    expect(schema?.properties.name).toBeDefined();
  });
});
