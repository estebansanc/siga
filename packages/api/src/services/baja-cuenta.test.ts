import { prisma, runWithAuditActor } from "@repo/db";
import { fechaArgentina, sumarDias } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createClase,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { getMe, solicitarBaja, updateProfile } from "./me";
import { listarNovedades, publicarNovedad } from "./novedades";
import { desactivarUsuario, listarUsuarios, reactivarUsuario } from "./usuarios";

let institution: TestOrganization;
let docente: TestUser;

const comoDocente = <T>(fn: () => Promise<T>) =>
  runWithAuditActor({ userId: docente.userId, organizationId: institution.organizationId }, fn);
const comoBedel = <T>(fn: () => Promise<T>) => runWithAuditActor(institution.actor, fn);

const docenteAuth = () => authOf(institution, docente);
const bedelAuth = () => authOf(institution, institution);

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

const auditoria = (entity: string, entityId: string) =>
  prisma.auditLog.findMany({ where: { entity, entityId }, orderBy: { createdAt: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  docente = await createUserWithPerfil(institution, "DOCENTE");
});

describe("editar mi perfil", () => {
  it("guarda apellido y nombre, DNI y legajo, y GET /me los devuelve", async () => {
    const me = await comoDocente(() =>
      updateProfile(docenteAuth(), { name: "Pérez, Ana", dni: "30111222", legajo: "L-55" }),
    );
    expect(me).toMatchObject({ userName: "Pérez, Ana", dni: "30111222", legajo: "L-55" });
    expect(await getMe(docenteAuth())).toMatchObject({ dni: "30111222", legajo: "L-55" });
  });

  it("rechaza el DNI de otra cuenta con 409 en el campo dni y no guarda nada", async () => {
    const otro = await createUserWithPerfil(institution, "ESTUDIANTE");
    await prisma.userProfile.update({ where: { userId: otro.userId }, data: { dni: "30111222" } });

    const error = await comoDocente(() =>
      rejection(updateProfile(docenteAuth(), { name: "Nombre Nuevo", dni: "30111222" })),
    );

    expect(error).toMatchObject({
      status: 409,
      issues: [{ path: "dni", message: "Ya existe un usuario con ese DNI" }],
    });
    expect((await getMe(docenteAuth())).userName).toBe(docente.userName);
  });

  it("conserva el propio DNI sin chocar consigo mismo", async () => {
    await comoDocente(() => updateProfile(docenteAuth(), { name: "A B", dni: "30111222" }));
    const me = await comoDocente(() =>
      updateProfile(docenteAuth(), { name: "A B C", dni: "30111222" }),
    );
    expect(me).toMatchObject({ userName: "A B C", dni: "30111222" });
  });

  it("audita la edición con los datos de antes y después", async () => {
    await comoDocente(() => updateProfile(docenteAuth(), { name: "A B", dni: "30111222" }));
    const [registro] = await auditoria("UserProfile", docente.userId);
    expect(registro).toMatchObject({
      userId: docente.userId,
      action: "update",
      before: { dni: null },
      after: { dni: "30111222" },
    });
  });
});

describe("solicitar la baja", () => {
  it("registra fecha y motivo, la cuenta sigue activa y Mi perfil lo refleja", async () => {
    const me = await comoDocente(() =>
      solicitarBaja(docenteAuth(), { motivo: "Dejo la institución" }),
    );

    expect(me.bajaSolicitadaEn).not.toBeNull();
    const perfil = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: docente.userId },
    });
    expect(perfil).toMatchObject({ activo: true, bajaMotivo: "Dejo la institución" });
  });

  it("acepta no dar motivo", async () => {
    await comoDocente(() => solicitarBaja(docenteAuth(), {}));
    const perfil = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: docente.userId },
    });
    expect(perfil.bajaMotivo).toBeNull();
  });

  it("no admite una segunda solicitud mientras hay una pendiente", async () => {
    await comoDocente(() => solicitarBaja(docenteAuth(), {}));
    const error = await comoDocente(() => rejection(solicitarBaja(docenteAuth(), {})));
    expect(error).toMatchObject({ status: 409 });
  });

  it("audita la solicitud con usuario y fecha", async () => {
    await comoDocente(() => solicitarBaja(docenteAuth(), { motivo: "Motivo" }));
    const [registro] = await auditoria("UserProfile", docente.userId);
    expect(registro).toMatchObject({ userId: docente.userId, action: "update" });
    expect(registro?.createdAt).toBeInstanceOf(Date);
    expect(registro?.after).toMatchObject({ bajaMotivo: "Motivo" });
  });
});

describe("resolver la baja desde Usuarios", () => {
  beforeEach(async () => {
    await comoDocente(() => solicitarBaja(docenteAuth(), { motivo: "Dejo la institución" }));
  });

  it("lista la marca con fecha y motivo y filtra solo esas cuentas", async () => {
    await createUserWithPerfil(institution, "ESTUDIANTE");

    const todos = await listarUsuarios(bedelAuth(), {});
    const filtrados = await listarUsuarios(bedelAuth(), { bajaSolicitada: "true" });

    expect(todos.length).toBeGreaterThan(filtrados.length);
    expect(filtrados).toEqual([
      expect.objectContaining({
        id: docente.userId,
        bajaSolicitada: { solicitadaEn: expect.any(String), motivo: "Dejo la institución" },
      }),
    ]);
  });

  it("desactivar deja la cuenta Desactivada, sin marca, y audita la resolución", async () => {
    const usuario = await comoBedel(() => desactivarUsuario(bedelAuth(), docente.userId));

    expect(usuario).toMatchObject({ estado: "DESACTIVADO", bajaSolicitada: null });
    expect(await listarUsuarios(bedelAuth(), { bajaSolicitada: "true" })).toEqual([]);
    const registros = await auditoria("UserProfile", docente.userId);
    expect(registros.at(-1)).toMatchObject({
      userId: institution.userId,
      action: "update",
      after: { activo: false, bajaResueltaAt: expect.any(String) },
    });
  });

  it("reactivar no reabre la solicitud y Mi perfil vuelve a ofrecer la baja", async () => {
    await comoBedel(() => desactivarUsuario(bedelAuth(), docente.userId));
    const usuario = await comoBedel(() => reactivarUsuario(bedelAuth(), docente.userId));

    expect(usuario).toMatchObject({ estado: "PENDIENTE", bajaSolicitada: null });
    expect((await getMe(docenteAuth())).bajaSolicitadaEn).toBeNull();
    const me = await comoDocente(() => solicitarBaja(docenteAuth(), {}));
    expect(me.bajaSolicitadaEn).not.toBeNull();
  });

  it("conserva a la cuenta desactivada como autora de lo que publicó en Novedades", async () => {
    const fixture = await seedAcademicFixture(institution);
    const autora = authOf(institution, fixture.docente);
    const clase = await createClase(institution, fixture, sumarDias(fechaArgentina(new Date()), 1));
    await runWithAuditActor(
      { userId: fixture.docente.userId, organizationId: institution.organizationId },
      () => publicarNovedad(autora, { claseIds: [clase.id], tipo: "DEMORA", minutosDemora: 10 }),
    );
    await comoBedel(() => desactivarUsuario(bedelAuth(), fixture.docente.userId));

    expect(await listarNovedades(bedelAuth(), {})).toEqual([
      expect.objectContaining({
        publicadaPor: { id: fixture.docente.userId, nombre: fixture.docente.userName },
      }),
    ]);
  });
});
