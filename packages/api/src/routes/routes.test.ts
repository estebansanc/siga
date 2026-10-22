import type * as Auth from "@repo/auth";
import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiBasePath, createApi } from "../app";
import {
  authOf,
  createClase,
  createInstitution,
  createMember,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  signInAs,
  type TestOrganization,
} from "../test/db";

vi.mock("@repo/auth", async (importOriginal) => {
  const original = await importOriginal<typeof Auth>();
  return { ...original, readAuthContext: vi.fn() };
});

const { readAuthContext } = vi.mocked(await import("@repo/auth"));

const getAuthContext = {
  mockResolvedValue: (auth: Auth.AuthContext | null) =>
    readAuthContext.mockResolvedValue({ auth, setCookies: [] }),
  mockResolvedValueOnce: (auth: Auth.AuthContext | null) =>
    readAuthContext.mockResolvedValueOnce({ auth, setCookies: [] }),
};
const app = createApi();

let organization: TestOrganization;

const call = (path: string, init?: RequestInit) =>
  app.request(`${apiBasePath}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

const json = (body: unknown, method = "POST") => ({ method, body: JSON.stringify(body) });

const ownerAuthOf = (test: TestOrganization): Auth.AuthContext => ({
  userId: test.userId,
  organizationId: test.organizationId,
  role: "owner",
  perfil: "BEDEL",
  userName: `Usuario ${test.userId}`,
  userEmail: test.userEmail,
  lostOrganization: null,
});

// El contexto de sesión del miembro con la organización ajena (`organization`) activa.
const asMember = (member: TestOrganization): Auth.AuthContext => ({
  ...ownerAuthOf(member),
  organizationId: organization.organizationId,
  role: "member",
});

beforeEach(async () => {
  await resetDatabase();
  organization = await createOrganization();
  getAuthContext.mockResolvedValue(ownerAuthOf(organization));
});

describe("contrato HTTP", () => {
  it("devuelve 401 sin sesión y 200 con sesión", async () => {
    getAuthContext.mockResolvedValueOnce(null);
    expect((await call("/me")).status).toBe(401);
    const ok = await call("/me");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({
      userId: organization.userId,
      organizationId: organization.organizationId,
      role: "owner",
    });
  });

  it("valida el body con 422 y detalle por campo", async () => {
    const response = await call("/invitations", json({ email: "no-es-un-email" }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string; issues: { path: string }[] } };
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.issues.map((issue) => issue.path)).toEqual(["email"]);
  });

  it("responde 404 con el formato de error en una ruta inexistente de un recurso", async () => {
    const response = await call("/invitations/no-existe");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Invitación no encontrado" },
    });
  });

  it("protege el cron con el secreto", async () => {
    getAuthContext.mockResolvedValue(null);
    expect((await call("/cron/daily")).status).toBe(401);
    const daily = await call("/cron/daily", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(daily.status).toBe(200);
    expect(await daily.json()).toEqual({
      emails: { processed: 0, failed: 0 },
      purgedRateLimitBuckets: 0,
    });
  });

  it("ajustes: lee el nombre, lo cambia con validación y lo refleja en quién soy", async () => {
    expect(await (await call("/settings")).json()).toEqual({
      name: organization.organizationName,
    });
    expect((await call("/settings", json({ name: "   " }, "PATCH"))).status).toBe(422);
    const renamed = await call("/settings", json({ name: "  Organización QA  " }, "PATCH"));
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toEqual({ name: "Organización QA" });
    const me = (await (await call("/me")).json()) as { organizations: { name: string }[] };
    expect(me.organizations[0]?.name).toBe("Organización QA");
  });

  it("perfil: cambia el nombre del usuario y lo devuelve en quién soy", async () => {
    expect((await call("/me", json({ name: "" }, "PATCH"))).status).toBe(422);
    const updated = await call("/me", json({ name: "  Ana Pérez " }, "PATCH"));
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ userName: "Ana Pérez" });
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: organization.userId } }),
    ).toMatchObject({
      name: "Ana Pérez",
    });
  });

  it("invita, lista, reenvía y cancela; la invitación se lee y solo la acepta el invitado", async () => {
    const headers = Object.fromEntries(await signInAs(organization.userId));
    const invited = await call("/invitations", { ...json({ email: "Ana@x.com" }), headers });
    expect(invited.status).toBe(201);
    const invitation = (await invited.json()) as { id: string; email: string };
    expect(invitation.email).toBe("ana@x.com");
    expect((await call("/invitations", { ...json({ email: "ana@x.com" }), headers })).status).toBe(
      409,
    );

    const listed = await call("/invitations");
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual([expect.objectContaining({ id: invitation.id })]);

    const resent = await call(`/invitations/${invitation.id}/resend`, { method: "POST", headers });
    expect(resent.status).toBe(200);
    expect(await resent.json()).toMatchObject({ id: invitation.id });
    expect(await prisma.emailOutbox.count()).toBe(2);

    const read = await call(`/invitations/${invitation.id}`, { headers });
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ status: "PENDING", forCurrentUser: false });
    const accepted = await call(`/invitations/${invitation.id}/accept`, {
      method: "POST",
      headers,
    });
    expect(accepted.status).toBe(403);
    expect(await accepted.json()).toEqual({
      error: {
        code: "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION",
        message: "Esta invitación es para otro email",
      },
    });

    const cancelled = await call(`/invitations/${invitation.id}/cancel`, {
      method: "POST",
      headers,
    });
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toEqual({ ok: true });
    expect(await (await call("/invitations")).json()).toEqual([]);
    expect(
      (await call(`/invitations/${invitation.id}/resend`, { method: "POST", headers })).status,
    ).toBe(404);
    expect(await (await call(`/invitations/${invitation.id}`, { headers })).json()).toMatchObject({
      status: "CANCELED",
    });
  });

  it("miembros: lista con el Administrador primero y quita a un miembro, nunca al Administrador", async () => {
    const member = await createMember(organization);
    const listed = (await (await call("/members")).json()) as { userId: string; role: string }[];
    expect(listed.map((item) => [item.userId, item.role])).toEqual([
      [organization.userId, "owner"],
      [member.userId, "member"],
    ]);

    expect((await call(`/members/${organization.userId}`, { method: "DELETE" })).status).toBe(400);
    expect((await call("/members/no-existe", { method: "DELETE" })).status).toBe(404);
    const removed = await call(`/members/${member.userId}`, { method: "DELETE" });
    expect(removed.status).toBe(200);
    expect(await (await call("/members")).json()).toHaveLength(1);
  });

  it("el spec OpenAPI incluye todos los recursos", async () => {
    const spec = (await (await call("/openapi.json")).json()) as { paths: Record<string, unknown> };
    for (const path of [
      "/api/v1/me",
      "/api/v1/settings",
      "/api/v1/members",
      "/api/v1/invitations",
      "/api/v1/invitations/{id}/accept",
      "/api/v1/cron/daily",
      "/api/v1/estado-institucional",
      "/api/v1/estado-institucional/historial",
      "/api/v1/clases",
      "/api/v1/clases/{id}",
      "/api/v1/novedades",
      "/api/v1/novedades/{id}/finalizar",
      "/api/v1/preferencias",
      "/api/v1/carreras",
      "/api/v1/materias",
      "/api/v1/comisiones",
      "/api/v1/comisiones/generar-clases",
      "/api/v1/aulas/disponibles",
    ]) {
      expect(spec.paths).toHaveProperty(path);
    }
  });
});

describe("rol de miembro", () => {
  it("GET /me expone rol y las organizaciones de la cuenta", async () => {
    const member = await createMember(organization);
    getAuthContext.mockResolvedValueOnce(asMember(member));
    const me = await call("/me");
    expect(await me.json()).toMatchObject({
      userId: member.userId,
      organizationId: organization.organizationId,
      role: "member",
      organizations: expect.arrayContaining([
        expect.objectContaining({ id: member.organizationId, role: "owner" }),
        expect.objectContaining({ id: organization.organizationId, role: "member" }),
      ]),
      lostOrganization: null,
    });
  });

  it("GET /me expone la organización perdida cuando la sesión volvió a la propia", async () => {
    const member = await createMember(organization);
    getAuthContext.mockResolvedValueOnce({
      ...ownerAuthOf(member),
      lostOrganization: { id: organization.organizationId, name: organization.organizationName },
    });
    const me = await call("/me");
    expect(await me.json()).toMatchObject({
      organizationId: member.organizationId,
      lostOrganization: { id: organization.organizationId, name: organization.organizationName },
    });
  });

  it("un miembro no escribe Configuración de la organización ajena, pero la lee igual", async () => {
    const member = await createMember(organization);
    const asLinked = () => getAuthContext.mockResolvedValueOnce(asMember(member));

    asLinked();
    expect((await call("/settings", json({ name: "Otra" }, "PATCH"))).status).toBe(403);
    asLinked();
    expect((await call("/invitations", json({ email: "x@x.com" }))).status).toBe(403);
    asLinked();
    expect((await call("/invitations")).status).toBe(403);
    asLinked();
    expect((await call(`/members/${organization.userId}`, { method: "DELETE" })).status).toBe(403);

    asLinked();
    const settings = await call("/settings");
    expect(settings.status).toBe(200);
    expect(await settings.json()).toEqual({ name: organization.organizationName });
    asLinked();
    expect((await call("/members")).status).toBe(200);
  });
});

describe("SiGA: perfiles y flujo principal por HTTP", () => {
  it("cada ruta responde 403 a los perfiles que no la usan, y 422 con detalle por campo", async () => {
    const institution = await createInstitution();
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const docente = await createUserWithPerfil(institution, "DOCENTE");
    const como = (user: Parameters<typeof authOf>[1]) =>
      getAuthContext.mockResolvedValueOnce(authOf(institution, user));

    como(estudiante);
    expect(
      (await call("/estado-institucional", json({ estado: "CERRADA", motivo: "x" }))).status,
    ).toBe(403);
    como(estudiante);
    expect((await call("/novedades")).status).toBe(403);
    como(docente);
    expect((await call("/preferencias")).status).toBe(403);
    como(docente);
    expect((await call("/comisiones/generar-clases", json({}))).status).toBe(403);
    for (const perfil of [docente, estudiante]) {
      como(perfil);
      expect((await call("/aulas")).status).toBe(403);
      como(perfil);
      expect((await call("/aulas", json({}))).status).toBe(403);
      como(perfil);
      expect((await call("/aulas/x/baja", json({}))).status).toBe(403);
    }

    como(institution);
    const aula = { codigo: "Aula 99", edificio: "Edificio A", piso: "PB", capacidad: 35 };
    const creada = await call("/aulas", json(aula));
    expect(creada.status).toBe(201);
    como(institution);
    expect((await call("/aulas", json(aula))).status).toBe(409);
    como(institution);
    const fueraDeRango = await call("/aulas", json({ ...aula, codigo: "Otra", capacidad: 501 }));
    expect(fueraDeRango.status).toBe(422);
    const errores = (await fueraDeRango.json()) as { error: { issues: { path: string }[] } };
    expect(errores.error.issues.map((issue) => issue.path)).toEqual(["capacidad"]);

    como(institution);
    const invalido = await call("/estado-institucional", json({ estado: "CERRADA" }));
    expect(invalido.status).toBe(422);
    const body = (await invalido.json()) as { error: { issues: { path: string }[] } };
    expect(body.error.issues.map((issue) => issue.path)).toEqual(["motivo"]);
    como(docente);
    const demora = await call("/novedades", json({ claseIds: ["x"], tipo: "DEMORA" }));
    expect(demora.status).toBe(422);
  });

  it("bedel cierra la institución, docente publica una demora y el estudiante la ve en sus clases", async () => {
    const institution = await createInstitution();
    const fixture = await seedAcademicFixture(institution);
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const clase = await createClase(institution, fixture, manana, "08:00", "10:00");
    const como = (user: Parameters<typeof authOf>[1]) =>
      getAuthContext.mockResolvedValueOnce(authOf(institution, user));

    como(estudiante);
    expect(await (await call("/estado-institucional")).json()).toMatchObject({ estado: "ABIERTA" });
    como(institution);
    const cerrada = await call(
      "/estado-institucional",
      json({ estado: "ABIERTA_CON_NOVEDADES", motivo: "Paro de transporte" }),
    );
    expect(cerrada.status).toBe(201);
    expect(await cerrada.json()).toMatchObject({
      estado: { estado: "ABIERTA_CON_NOVEDADES", usuario: { id: institution.userId } },
      clasesSuspendidas: 0,
    });

    como(estudiante);
    const preferencias = await call(
      "/preferencias",
      json({ comisionIds: [fixture.comisionId] }, "PUT"),
    );
    expect(preferencias.status).toBe(200);

    como(fixture.docente);
    const publicada = await call(
      "/novedades",
      json({ claseIds: [clase.id], tipo: "DEMORA", minutosDemora: "15", mensaje: "Arranco 8:15" }),
    );
    expect(publicada.status).toBe(201);

    como(estudiante);
    const clases = await call(`/clases?fecha=${manana}&anio=5`);
    expect(clases.status).toBe(200);
    expect(await clases.json()).toMatchObject({
      fecha: manana,
      clases: [
        {
          id: clase.id,
          estado: "DEMORADA",
          novedades: [{ tipo: "DEMORA", minutosDemora: 15, mensaje: "Arranco 8:15" }],
        },
      ],
    });
    como(estudiante);
    expect(await (await call(`/aulas/disponibles?claseIds=${clase.id}`)).json()).toEqual([
      expect.objectContaining({ codigo: "Aula 7" }),
      expect.objectContaining({ codigo: "Aula 12" }),
    ]);
    como(estudiante);
    expect((await call("/clases?anio=9")).status).toBe(422);
  });
});

describe("baja de correos sin sesión", () => {
  it("con token válido desactiva la opción y con uno alterado responde 400", async () => {
    const institution = await createInstitution();
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    await prisma.userProfile.update({
      where: { userId: estudiante.userId },
      data: { notificarNovedadesPorCorreo: true },
    });
    getAuthContext.mockResolvedValue(null);
    const { crearTokenBajaNovedades } = await import("../services/notificaciones");
    const token = crearTokenBajaNovedades(estudiante.userId);

    const alterada = await call("/preferencias/baja-correo", json({ token: `${token}x` }));
    expect(alterada.status).toBe(400);
    expect(await alterada.json()).toMatchObject({
      error: { message: "El enlace para dejar de recibir correos no es válido." },
    });

    const valida = await call("/preferencias/baja-correo", json({ token }));
    expect(valida.status).toBe(200);
    expect(
      (await prisma.userProfile.findUniqueOrThrow({ where: { userId: estudiante.userId } }))
        .notificarNovedadesPorCorreo,
    ).toBe(false);
  });
});

describe("Solicitudes de aula por HTTP", () => {
  it("restringe a Docente y Bedel, valida alumnos con detalle y crea la solicitud", async () => {
    const institution = await createInstitution();
    const fixture = await seedAcademicFixture(institution);
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const clase = await createClase(institution, fixture, "2099-10-14");
    getAuthContext.mockResolvedValue(authOf(institution, estudiante));
    expect((await call("/solicitudes-aula/clases")).status).toBe(403);
    expect((await call("/solicitudes-aula/mias")).status).toBe(403);

    getAuthContext.mockResolvedValue(authOf(institution, fixture.docente));
    const sinAlumnos = await call(`/solicitudes-aula/aulas?claseId=${clase.id}&alumnos=0`);
    expect(sinAlumnos.status).toBe(422);
    expect(JSON.stringify(await sinAlumnos.json())).toContain(
      "Ingresá una cantidad de alumnos mayor que 0.",
    );

    const busqueda = await call(
      `/solicitudes-aula/aulas?claseId=${clase.id}&alumnos=40&recursos=Proyector`,
    );
    expect(busqueda.status).toBe(200);
    expect(
      ((await busqueda.json()) as { aulas: { codigo: string }[] }).aulas.map(
        (aula: { codigo: string }) => aula.codigo,
      ),
    ).toEqual(["Aula 12"]);

    const pedido = { claseId: clase.id, aulaId: fixture.otraAulaId, alumnos: 40, recursos: [] };
    const creada = await call("/solicitudes-aula", json(pedido));
    expect(creada.status).toBe(201);
    expect(((await creada.json()) as { estado: string }).estado).toBe("PENDIENTE");
    const duplicada = await call("/solicitudes-aula", json(pedido));
    expect(duplicada.status).toBe(409);
    expect(((await (await call("/solicitudes-aula/mias")).json()) as unknown[]).length).toBe(1);
  });
});
