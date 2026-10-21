import { prisma } from "@repo/db";
import { turnosIniciales } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { createOrganization, resetDatabase, type TestOrganization } from "../test/db";

import { getSettings, updateSettings } from "./settings";

let organization: TestOrganization;

beforeEach(async () => {
  await resetDatabase();
  organization = await createOrganization();
});

describe("ajustes", () => {
  it("arranca con el nombre de la organización y sin fila de ajustes", async () => {
    expect(await getSettings(organization.organizationId)).toEqual({
      name: organization.organizationName,
      turnos: turnosIniciales,
    });
    expect(await prisma.organizationSettings.count()).toBe(0);
  });

  it("renombra la organización y crea la fila de ajustes una sola vez", async () => {
    expect(await updateSettings(organization.organizationId, { name: "Organización QA" })).toEqual({
      name: "Organización QA",
      turnos: turnosIniciales,
    });
    expect(await updateSettings(organization.organizationId, {})).toEqual({
      name: "Organización QA",
      turnos: turnosIniciales,
    });
    expect(await prisma.organizationSettings.count()).toBe(1);
    expect((await getSettings(organization.organizationId)).name).toBe("Organización QA");
  });

  it("guarda los turnos, los conserva al renombrar y los devuelve al leer", async () => {
    const turnos = { ...turnosIniciales, NOCHE: { inicio: "18:00", fin: "23:00" } };
    expect((await updateSettings(organization.organizationId, { turnos })).turnos).toEqual(turnos);
    await updateSettings(organization.organizationId, { name: "Otro nombre" });
    expect((await getSettings(organization.organizationId)).turnos).toEqual(turnos);
  });
});
