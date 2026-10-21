import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createClase,
  createInstitution,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import { listarAulasDisponibles } from "./aulas";

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
