import { auth, getAuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import { createInstitution, resetDatabase, type TestOrganization } from "../test/db";

let institution: TestOrganization;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
});

// El hook de sesión de `packages/auth/src/server.ts`: una cuenta nueva entra a la institución.
describe("autorregistro de estudiante", () => {
  it("la primera sesión suma la cuenta a la institución con perfil Estudiante y la audita", async () => {
    const { headers } = await auth.api.signUpEmail({
      body: { name: "Lucía Gómez", email: "lucia@alu.frt.utn.edu.ar", password: "lucia1234" },
      returnHeaders: true,
    });
    const cookie = headers.get("set-cookie") ?? "";
    const context = await getAuthContext(new Headers({ cookie }));
    expect(context).toMatchObject({
      organizationId: institution.organizationId,
      role: "member",
      perfil: "ESTUDIANTE",
      lostOrganization: null,
    });
    expect(await prisma.organization.count()).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { entity: "UserProfile", action: "create" } }),
    ).toBe(1);
  });

  it("una cuenta desactivada no obtiene contexto de sesión", async () => {
    const { headers } = await auth.api.signUpEmail({
      body: { name: "Tomás", email: "tomas@example.com", password: "tomas1234" },
      returnHeaders: true,
    });
    const cookie = headers.get("set-cookie") ?? "";
    await prisma.userProfile.updateMany({
      where: { user: { email: "tomas@example.com" } },
      data: { activo: false },
    });
    expect(await getAuthContext(new Headers({ cookie }))).toBeNull();
  });
});
