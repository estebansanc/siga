import { auth, AuthApiError, getAuthContext } from "@repo/auth";
import { prisma } from "@repo/db";
import { fechaArgentina } from "@repo/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../errors";
import {
  authOf,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  createClase,
  seedAcademicFixture,
  signInAs,
  signUpVerified,
  type TestOrganization,
} from "../test/db";

import { listarClases, obtenerClase } from "./clases";
import { buscarComisiones } from "./datos-academicos";
import {
  actualizarDominiosPermitidos,
  actualizarUsuario,
  crearUsuario,
  desactivarUsuario,
  listarUsuarios,
  obtenerDominiosPermitidos,
  reactivarUsuario,
  reenviarActivacion,
} from "./usuarios";

let institution: TestOrganization;
const bedel = () => authOf(institution, institution);

const alta = {
  nombre: "Pérez, Ana",
  dni: "30123456",
  correo: "ana@example.com",
  perfil: "DOCENTE" as const,
  comisionIds: [] as string[],
};

const activationTokens = async (userId: string) =>
  (
    await prisma.verification.findMany({
      where: { identifier: { startsWith: "reset-password:" }, value: userId },
    })
  ).map((verification) => verification.identifier.replace("reset-password:", ""));

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Debía fallar");
};

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
});

describe("alta de usuarios", () => {
  it("queda Pendiente de activación, manda el correo con el enlace y queda en auditoría", async () => {
    const usuario = await crearUsuario(bedel(), alta);

    expect(usuario).toMatchObject({
      nombre: "Pérez, Ana",
      correo: "ana@example.com",
      dni: "30123456",
      perfil: "DOCENTE",
      estado: "PENDIENTE",
    });
    const [correo] = await prisma.emailOutbox.findMany();
    expect(correo).toMatchObject({ to: "ana@example.com", subject: "Activá tu cuenta de SiGA" });
    const [token] = await activationTokens(usuario.id);
    expect(correo?.html).toContain(`/activar-cuenta?token=${token}`);
    expect(
      await prisma.auditLog.count({ where: { entity: "UserProfile", entityId: usuario.id } }),
    ).toBe(1);
    expect(await prisma.member.count({ where: { userId: usuario.id } })).toBe(1);
  });

  it("un Docente queda con sus comisiones; otro perfil las descarta", async () => {
    const { comisionId } = await seedAcademicFixture(institution);
    const docente = await crearUsuario(bedel(), { ...alta, comisionIds: [comisionId] });
    const estudiante = await crearUsuario(bedel(), {
      ...alta,
      dni: "30999888",
      correo: "est@example.com",
      perfil: "ESTUDIANTE",
      comisionIds: [comisionId],
    });
    expect(docente.comisiones).toEqual([expect.objectContaining({ id: comisionId })]);
    expect(estudiante.comisiones).toEqual([]);
  });

  it("rechaza una comisión inexistente", async () => {
    const error = await rejection(crearUsuario(bedel(), { ...alta, comisionIds: ["no-existe"] }));
    expect(error).toMatchObject({ status: 422 });
  });

  it("un DNI o correo repetido falla en su campo y no guarda", async () => {
    await crearUsuario(bedel(), alta);
    const dni = await rejection(crearUsuario(bedel(), { ...alta, correo: "otra@example.com" }));
    expect(dni).toMatchObject({ status: 409, issues: [{ path: "dni" }] });
    const correo = await rejection(
      crearUsuario(bedel(), { ...alta, dni: "30555111", correo: "ANA@example.com" }),
    );
    expect(correo).toMatchObject({ status: 409, issues: [{ path: "correo" }] });
    expect(await prisma.userProfile.count({ where: { dni: "30555111" } })).toBe(0);
  });

  it("un alta cuyo correo ya se registró sin verificar lo explica", async () => {
    await auth.api.signUpEmail({
      body: { name: "Lucía", email: "ana@example.com", password: "lucia1234" },
    });
    const error = await rejection(crearUsuario(bedel(), alta));
    expect(error).toMatchObject({
      status: 409,
      issues: [{ path: "correo", message: expect.stringContaining("todavía no verificó") }],
    });
  });

  it("si no se puede encolar el enlace el alta no persiste y responde 503", async () => {
    const encolado = vi
      .spyOn(prisma.emailOutbox, "create")
      .mockRejectedValueOnce(new Error("sin base"));
    const error = await rejection(crearUsuario(bedel(), alta));
    encolado.mockRestore();

    expect(error).toMatchObject({ status: 503 });
    expect(await prisma.user.count({ where: { email: alta.correo } })).toBe(0);
    expect(await prisma.userProfile.count({ where: { dni: alta.dni } })).toBe(0);
    expect((await crearUsuario(bedel(), alta)).estado).toBe("PENDIENTE");
  });

  it("si no se puede encolar el reenvío responde 503 y la cuenta sigue pendiente", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const encolado = vi
      .spyOn(prisma.emailOutbox, "create")
      .mockRejectedValueOnce(new Error("sin base"));
    const error = await rejection(reenviarActivacion(bedel(), usuario.id));
    encolado.mockRestore();

    expect(error).toMatchObject({ status: 503 });
    expect(await prisma.user.count({ where: { id: usuario.id } })).toBe(1);
  });
});

describe("activación con el enlace", () => {
  it("define la contraseña, verifica la cuenta y permite ingresar; el enlace usado se rechaza", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const [token] = await activationTokens(usuario.id);

    await auth.api.resetPassword({ body: { token: token!, newPassword: "clave1234" } });

    const { headers } = await auth.api.signInEmail({
      body: { email: alta.correo, password: "clave1234" },
      returnHeaders: true,
    });
    const contexto = await getAuthContext(new Headers({ cookie: headers.get("set-cookie") ?? "" }));
    expect(contexto).toMatchObject({ userId: usuario.id, perfil: "DOCENTE" });
    const [listado] = await listarUsuarios(bedel(), { q: "ana" });
    expect(listado?.estado).toBe("ACTIVO");

    const usado = await rejection(
      auth.api.resetPassword({ body: { token: token!, newPassword: "otra1234" } }),
    );
    expect(usado).toBeInstanceOf(AuthApiError);
  });

  it("rechaza una contraseña sin números", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const [token] = await activationTokens(usuario.id);
    const error = await rejection(
      auth.api.resetPassword({ body: { token: token!, newPassword: "sololetras" } }),
    );
    expect(error).toMatchObject({ body: { message: expect.stringContaining("letras y números") } });
  });

  it("rechaza un enlace vencido", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const [token] = await activationTokens(usuario.id);
    await prisma.verification.updateMany({
      where: { identifier: `reset-password:${token}` },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const error = await rejection(
      auth.api.resetPassword({ body: { token: token!, newPassword: "clave1234" } }),
    );
    expect(error).toBeInstanceOf(AuthApiError);
  });

  it("reenviar invalida el enlace anterior y el nuevo funciona", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const [anterior] = await activationTokens(usuario.id);

    await reenviarActivacion(bedel(), usuario.id);

    const tokens = await activationTokens(usuario.id);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).not.toBe(anterior);
    expect(await prisma.emailOutbox.count()).toBe(2);
    const viejo = await rejection(
      auth.api.resetPassword({ body: { token: anterior!, newPassword: "clave1234" } }),
    );
    expect(viejo).toBeInstanceOf(AuthApiError);
    await auth.api.resetPassword({ body: { token: tokens[0]!, newPassword: "clave1234" } });
  });

  it("no se reenvía a una cuenta ya activada", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    await prisma.user.update({ where: { id: usuario.id }, data: { emailVerified: true } });
    expect(await rejection(reenviarActivacion(bedel(), usuario.id))).toMatchObject({ status: 409 });
  });
});

describe("correo del enlace según la cuenta", () => {
  const asuntos = async (correo: string) =>
    (
      await prisma.emailOutbox.findMany({ where: { to: correo }, orderBy: { createdAt: "asc" } })
    ).map((email) => email.subject);

  it("una cuenta pendiente que reenvía recibe la activación", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    await reenviarActivacion(bedel(), usuario.id);
    expect(await asuntos(alta.correo)).toEqual([
      "Activá tu cuenta de SiGA",
      "Activá tu cuenta de SiGA",
    ]);
  });

  it("una cuenta verificada que pide el reset recibe el correo genérico", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    await prisma.user.update({ where: { id: usuario.id }, data: { emailVerified: true } });
    await auth.api.requestPasswordReset({
      body: { email: alta.correo, redirectTo: "/activar-cuenta" },
    });
    expect((await asuntos(alta.correo)).at(-1)).toBe("Definí tu contraseña de SiGA");
  });
});

describe("listado", () => {
  it("busca por nombre, correo o DNI y filtra por perfil", async () => {
    await crearUsuario(bedel(), alta);
    await crearUsuario(bedel(), {
      ...alta,
      nombre: "Gómez, Luis",
      dni: "28111222",
      correo: "luis@frt.utn.edu.ar",
      perfil: "ESTUDIANTE",
    });
    const nombres = async (query: Parameters<typeof listarUsuarios>[1]) =>
      (await listarUsuarios(bedel(), query)).map((usuario) => usuario.nombre);

    expect(await nombres({ q: "gómez" })).toEqual(["Gómez, Luis"]);
    expect(await nombres({ q: "ana@exam" })).toEqual(["Pérez, Ana"]);
    expect(await nombres({ q: "2811" })).toEqual(["Gómez, Luis"]);
    expect(await nombres({ perfil: "DOCENTE" })).toEqual(["Pérez, Ana"]);
    expect((await nombres({})).length).toBe(3);
  });

  it("marca la cuenta propia", async () => {
    const propios = (await listarUsuarios(bedel(), {})).filter((usuario) => usuario.esPropio);
    expect(propios.map((usuario) => usuario.id)).toEqual([institution.userId]);
  });
});

describe("edición", () => {
  it("cambia nombre, DNI, legajo, perfil y comisiones; el correo no cambia", async () => {
    const { comisionId } = await seedAcademicFixture(institution);
    const usuario = await crearUsuario(bedel(), alta);

    const editado = await actualizarUsuario(bedel(), usuario.id, {
      nombre: "Pérez, Ana María",
      dni: "30123457",
      legajo: "L-9",
      comisionIds: [comisionId],
    });

    expect(editado).toMatchObject({
      nombre: "Pérez, Ana María",
      dni: "30123457",
      legajo: "L-9",
      correo: "ana@example.com",
      comisiones: [expect.objectContaining({ id: comisionId })],
    });
  });

  it("al dejar de ser Docente pierde sus comisiones", async () => {
    const { comisionId } = await seedAcademicFixture(institution);
    const usuario = await crearUsuario(bedel(), { ...alta, comisionIds: [comisionId] });
    const editado = await actualizarUsuario(bedel(), usuario.id, { perfil: "BEDEL" });
    expect(editado).toMatchObject({ perfil: "BEDEL", comisiones: [] });
  });

  it("un DNI de otro usuario falla en el campo", async () => {
    await crearUsuario(bedel(), alta);
    const otro = await crearUsuario(bedel(), { ...alta, dni: "30000001", correo: "b@example.com" });
    const error = await rejection(actualizarUsuario(bedel(), otro.id, { dni: alta.dni }));
    expect(error).toMatchObject({ status: 409, issues: [{ path: "dni" }] });
  });

  it("nadie cambia su propio perfil", async () => {
    const error = await rejection(
      actualizarUsuario(bedel(), institution.userId, { perfil: "DOCENTE" }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422 });
    const mismoPerfil = await actualizarUsuario(bedel(), institution.userId, { perfil: "BEDEL" });
    expect(mismoPerfil.perfil).toBe("BEDEL");
  });
});

describe("desactivar y reactivar", () => {
  it("el desactivado pierde el contexto de sesión y no puede ingresar; reactivado vuelve", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    const [token] = await activationTokens(usuario.id);
    await auth.api.resetPassword({ body: { token: token!, newPassword: "clave1234" } });
    const sesion = await signInAs(usuario.id, institution.organizationId);

    expect(await desactivarUsuario(bedel(), usuario.id)).toMatchObject({ estado: "DESACTIVADO" });

    expect(await getAuthContext(sesion)).toBeNull();
    const login = await rejection(
      auth.api.signInEmail({ body: { email: alta.correo, password: "clave1234" } }),
    );
    expect(login).toMatchObject({ body: { message: "Tu cuenta está desactivada" } });

    expect(await reactivarUsuario(bedel(), usuario.id)).toMatchObject({ estado: "ACTIVO" });
    expect(await getAuthContext(sesion)).toMatchObject({ userId: usuario.id });
    await auth.api.signInEmail({ body: { email: alta.correo, password: "clave1234" } });
  });

  it("nadie se desactiva a sí mismo", async () => {
    expect(await rejection(desactivarUsuario(bedel(), institution.userId))).toMatchObject({
      status: 422,
    });
  });

  it("desactivar dos veces es un conflicto", async () => {
    const usuario = await crearUsuario(bedel(), alta);
    await desactivarUsuario(bedel(), usuario.id);
    expect(await rejection(desactivarUsuario(bedel(), usuario.id))).toMatchObject({ status: 409 });
  });

  it("las novedades de un docente desactivado siguen en la comisión", async () => {
    const { docente, comisionId } = await seedAcademicFixture(institution);
    const novedad = await prisma.novedad.create({
      data: {
        organizationId: institution.organizationId,
        comisionId,
        tipo: "AUSENCIA",
        publicadaPorId: docente.userId,
      },
    });
    await desactivarUsuario(bedel(), docente.userId);
    const guardada = await prisma.novedad.findUniqueOrThrow({
      where: { id: novedad.id },
      include: { publicadaPor: { select: { name: true } } },
    });
    expect(guardada.publicadaPor.name).toBe(docente.userName);
  });
});

describe("permisos", () => {
  it.each(["ESTUDIANTE", "DOCENTE"] as const)("%s recibe 403 y queda auditado", async (perfil) => {
    const usuario = await createUserWithPerfil(institution, perfil);
    const contexto = authOf(institution, usuario);
    expect(await rejection(listarUsuarios(contexto, {}))).toMatchObject({ status: 403 });
    expect(await rejection(crearUsuario(contexto, alta))).toMatchObject({ status: 403 });
    expect(
      await prisma.auditLog.count({ where: { entity: "Permiso", action: "acceso_denegado" } }),
    ).toBe(2);
  });

  it("la Autoridad también administra usuarios", async () => {
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    const usuario = await crearUsuario(authOf(institution, autoridad), alta);
    expect(usuario.estado).toBe("PENDIENTE");
  });
});

describe("dominios permitidos y autorregistro", () => {
  const registro = (email: string) =>
    auth.api.signUpEmail({ body: { name: "Lucía", email, password: "lucia1234" } });

  it("sin dominios cargados acepta cualquier correo", async () => {
    expect(await obtenerDominiosPermitidos(bedel())).toEqual({ dominios: [] });
    await registro("lucia@gmail.com");
    expect(await prisma.user.count({ where: { email: "lucia@gmail.com" } })).toBe(1);
  });

  it("con dominios rechaza otro dominio nombrando los aceptados", async () => {
    await actualizarDominiosPermitidos(bedel(), { dominios: ["frt.utn.edu.ar", "utn.edu.ar"] });
    const error = await rejection(registro("lucia@gmail.com"));
    expect(error).toMatchObject({
      body: { message: "Solo se aceptan correos de frt.utn.edu.ar, utn.edu.ar" },
    });
    expect(await prisma.user.count()).toBe(1);
    await registro("lucia@frt.utn.edu.ar");
    expect(await prisma.user.count({ where: { email: "lucia@frt.utn.edu.ar" } })).toBe(1);
  });

  it("las altas del Bedel no pasan por los dominios", async () => {
    await actualizarDominiosPermitidos(bedel(), { dominios: ["frt.utn.edu.ar"] });
    expect((await crearUsuario(bedel(), alta)).estado).toBe("PENDIENTE");
  });

  it("no ingresa hasta verificar el correo: manda el enlace y con él entra", async () => {
    await registro("lucia@example.com");
    const [correo] = await prisma.emailOutbox.findMany({ where: { to: "lucia@example.com" } });
    expect(correo?.subject).toBe("Verificá tu correo en SiGA");

    const login = await rejection(
      auth.api.signInEmail({ body: { email: "lucia@example.com", password: "lucia1234" } }),
    );
    expect(login).toMatchObject({ body: { code: "EMAIL_NOT_VERIFIED" } });

    const url = /href="([^"]+)"/.exec(correo?.html ?? "")?.[1]?.replaceAll("&amp;", "&");
    const token = new URL(url!).searchParams.get("token")!;
    await auth.api.verifyEmail({ query: { token } });
    const { headers } = await auth.api.signInEmail({
      body: { email: "lucia@example.com", password: "lucia1234" },
      returnHeaders: true,
    });
    expect(headers.get("set-cookie")).toContain("session_token");
  });

  it("rechaza una contraseña sin números al registrarse", async () => {
    const error = await rejection(
      auth.api.signUpEmail({
        body: { name: "Lucía", email: "l@example.com", password: "sololetras" },
      }),
    );
    expect(error).toMatchObject({ body: { message: expect.stringContaining("letras y números") } });
  });

  it("registrarse y verificar deja a la cuenta como Estudiante", async () => {
    await signUpVerified({ name: "Lucía", email: "lucia@example.com", password: "lucia1234" });
    const [usuario] = await listarUsuarios(bedel(), { q: "lucia@" });
    expect(usuario).toMatchObject({ perfil: "ESTUDIANTE", estado: "ACTIVO" });
  });
});

describe("PRI-3: el estudiante ve solo el nombre del docente", () => {
  it("las comisiones y las clases traen del docente únicamente id y nombre", async () => {
    const fixture = await seedAcademicFixture(institution);
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const clase = await createClase(
      institution,
      fixture,
      fechaArgentina(new Date()),
      "00:00",
      "23:59",
    );
    const contexto = authOf(institution, estudiante);

    const comisiones = await buscarComisiones(institution.organizationId, {});
    const delDia = (await listarClases(contexto, { ambito: "todas" })).clases;
    const detalle = await obtenerClase(contexto, clase.id);

    const docentes = [...comisiones, ...delDia, detalle].flatMap((item) => item.docentes);
    expect(docentes.length).toBeGreaterThan(0);
    for (const docente of docentes) expect(Object.keys(docente).sort()).toEqual(["id", "nombre"]);
    expect(JSON.stringify([comisiones, delDia, detalle])).not.toContain(fixture.docente.userEmail);
  });
});
