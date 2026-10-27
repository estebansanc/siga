import { auth, getAuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createInstitution,
  createMember,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  signInAs,
  type TestOrganization,
} from "../test/db";

let institution: TestOrganization;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
});

describe("sesión fija en la institución", () => {
  it("una cuenta miembro de la institución y de otra más antigua trabaja en la institución", async () => {
    const student = await createUserWithPerfil(institution, "ESTUDIANTE");
    const older = await createOrganization();
    await prisma.member.create({
      data: {
        id: "member-antigua",
        organizationId: older.organizationId,
        userId: student.userId,
        role: "member",
        createdAt: new Date(0),
      },
    });
    const context = await getAuthContext(await signInAs(student.userId, older.organizationId));
    expect(context?.organizationId).toBe(institution.organizationId);
    expect(context?.role).toBe("member");
  });

  it("una cuenta solo con la membresía de la institución trabaja en la institución", async () => {
    const student = await createUserWithPerfil(institution, "ESTUDIANTE");
    const context = await getAuthContext(
      await signInAs(student.userId, institution.organizationId),
    );
    expect(context?.organizationId).toBe(institution.organizationId);
    expect(context?.lostOrganization).toBeNull();
  });

  it("una cuenta Administrador de otra organización y miembro de la institución trabaja en la institución", async () => {
    const account = await createMember(institution);
    const context = await getAuthContext(await signInAs(account.userId));
    expect(context?.organizationId).toBe(institution.organizationId);
    expect(context?.role).toBe("member");
  });

  it("una sesión con otra organización activa pasa a la institución sin aviso de baja", async () => {
    const account = await createMember(institution);
    const context = await getAuthContext(await signInAs(account.userId, account.organizationId));
    expect(context?.organizationId).toBe(institution.organizationId);
    expect(context?.lostOrganization).toBeNull();
  });

  it("una cuenta solo con otras organizaciones no se da de alta en la institución", async () => {
    const other = await createOrganization();
    const context = await getAuthContext(await signInAs(other.userId));
    expect(context?.organizationId).toBe(other.organizationId);
    expect(
      await prisma.member.count({
        where: { userId: other.userId, organizationId: institution.organizationId },
      }),
    ).toBe(0);
  });

  it("al iniciar sesión, la sesión nueva queda en la institución aunque haya otra más antigua", async () => {
    const credentials = { email: "dos@alu.frt.utn.edu.ar", password: "dos-12345" };
    await auth.api.signUpEmail({ body: { name: "Dos Orgs", ...credentials } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
    await prisma.organization.create({
      data: {
        id: "org-previa",
        name: "Previa",
        slug: "previa",
        createdAt: new Date(),
        members: {
          create: { id: "member-previa", userId: user.id, role: "owner", createdAt: new Date(0) },
        },
      },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });

    await auth.api.signInEmail({ body: credentials });

    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.activeOrganizationId).toBe(institution.organizationId);
  });
});
