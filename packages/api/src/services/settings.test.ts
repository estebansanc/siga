import { prisma } from "@repo/db";
import { presenciaInicial, turnosIniciales } from "@repo/domain";
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
      presencia: presenciaInicial,
    });
    expect(await prisma.organizationSettings.count()).toBe(0);
  });

  it("renombra la organización y crea la fila de ajustes una sola vez", async () => {
    expect(await updateSettings(organization.organizationId, { name: "Organización QA" })).toEqual({
      name: "Organización QA",
      turnos: turnosIniciales,
      presencia: presenciaInicial,
    });
    expect(await updateSettings(organization.organizationId, {})).toEqual({
      name: "Organización QA",
      turnos: turnosIniciales,
      presencia: presenciaInicial,
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

describe("presencia del docente", () => {
  const presencia = {
    latitud: -26.8,
    longitud: -65.2,
    radioMetros: 150,
    redes: ["200.45.10.0/24", "10.0.0.0/8"],
  };

  it("sin guardar rigen la sede y el radio iniciales, con la red vacía", async () => {
    expect((await getSettings(organization.organizationId)).presencia).toEqual(presenciaInicial);
  });

  it("guarda ubicación, radio y redes, y los conserva al cambiar otro ajuste", async () => {
    expect((await updateSettings(organization.organizationId, { presencia })).presencia).toEqual(
      presencia,
    );
    const luego = await updateSettings(organization.organizationId, { name: "Otro nombre" });
    expect(luego.presencia).toEqual(presencia);
    expect(luego.turnos).toEqual(turnosIniciales);
  });

  it("guardar la presencia no pisa los turnos ya guardados", async () => {
    const turnos = { ...turnosIniciales, NOCHE: { inicio: "18:00", fin: "23:00" } };
    await updateSettings(organization.organizationId, { turnos });
    const luego = await updateSettings(organization.organizationId, { presencia });
    expect(luego.turnos).toEqual(turnos);
  });
});
