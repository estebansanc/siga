import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { actualizarPreferencias, obtenerPreferencias } from "./preferencias";

let institution: TestOrganization;
let fixture: AcademicFixture;
let estudiante: TestUser;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
});

describe("preferencias del estudiante", () => {
  it("reemplaza el conjunto de comisiones seguidas y lo devuelve con sus datos", async () => {
    const auth = authOf(institution, estudiante);
    expect(await obtenerPreferencias(auth)).toEqual({ comisiones: [] });
    expect(
      await actualizarPreferencias(auth, { comisionIds: [fixture.comisionId, fixture.comisionId] }),
    ).toEqual({
      comisiones: [expect.objectContaining({ id: fixture.comisionId, codigo: "5K2" })],
    });
    expect(await actualizarPreferencias(auth, { comisionIds: [] })).toEqual({ comisiones: [] });
    expect(await prisma.auditLog.count({ where: { action: "preferencias" } })).toBe(2);
  });

  it("rechaza comisiones inexistentes o inactivas y a los demás perfiles", async () => {
    const auth = authOf(institution, estudiante);
    await expect(
      actualizarPreferencias(auth, { comisionIds: ["no-existe"] }),
    ).rejects.toMatchObject({
      status: 422,
    });
    await prisma.comision.update({ where: { id: fixture.comisionId }, data: { activa: false } });
    await expect(
      actualizarPreferencias(auth, { comisionIds: [fixture.comisionId] }),
    ).rejects.toMatchObject({
      status: 422,
    });
    await expect(obtenerPreferencias(authOf(institution, fixture.docente))).rejects.toMatchObject({
      status: 403,
    });
  });
});
