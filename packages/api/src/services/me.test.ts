import type { AuthContext } from "@repo/auth";
import { beforeEach, describe, expect, it } from "vitest";

import { createMember, createOrganization, resetDatabase, type TestOrganization } from "../test/db";

import { getMe, updateProfile } from "./me";

let organization: TestOrganization;

const authOf = (test: TestOrganization): AuthContext => ({
  userId: test.userId,
  organizationId: test.organizationId,
  role: "owner",
  perfil: "BEDEL",
  userName: "Nombre de la cookie",
  userEmail: test.userEmail,
  lostOrganization: null,
});

beforeEach(async () => {
  await resetDatabase();
  organization = await createOrganization();
});

describe("quién soy", () => {
  it("toma nombre y email de la base, no de la sesión, y lista las organizaciones", async () => {
    const member = await createMember(organization);
    expect(await getMe(authOf(member))).toEqual({
      userId: member.userId,
      userName: `Usuario ${member.userId.slice(5)}`,
      userEmail: member.userEmail,
      organizationId: member.organizationId,
      role: "owner",
      perfil: "BEDEL",
      organizations: [
        expect.objectContaining({ id: member.organizationId, role: "owner" }),
        expect.objectContaining({ id: organization.organizationId, role: "member" }),
      ],
      politicaPendiente: true,
      lostOrganization: null,
    });
  });

  it("actualizar el perfil cambia el nombre y lo devuelve al instante", async () => {
    const me = await updateProfile(authOf(organization), { name: "Ana Pérez" });
    expect(me.userName).toBe("Ana Pérez");
    expect((await getMe(authOf(organization))).userName).toBe("Ana Pérez");
  });
});
