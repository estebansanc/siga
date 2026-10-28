import { auth, AuthApiError } from "@repo/auth";
import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import { createInstitution, resetDatabase, signUpVerified } from "../test/db";

const correo = "ana@example.com";
const clave = "clave1234";
const fallida = "incorrecta1";

type Resultado = { status: number; message?: string; code?: string; headers: Headers };

// Los rechazos de los hooks previos salen como excepción aun con `asResponse`.
const ingresar = async (password: string, email = correo): Promise<Resultado> => {
  try {
    const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const body = (await response.json()) as { message?: string; code?: string };
    return { status: response.status, headers: response.headers, ...body };
  } catch (error) {
    if (!(error instanceof AuthApiError)) throw error;
    const body = error.body as { message?: string; code?: string };
    return { status: error.statusCode, headers: new Headers(), ...body };
  }
};

const mensajeDe = (resultado: Resultado) => resultado.message;

const fallar = async (veces: number) => {
  for (let i = 0; i < veces; i += 1) await ingresar(fallida);
};

const bloqueo = async () => {
  const user = await prisma.user.findFirstOrThrow({ where: { email: correo } });
  return prisma.bloqueoCuenta.findUnique({ where: { userId: user.id } });
};

const auditorias = (action: string) =>
  prisma.auditLog.findMany({ where: { entity: "Ingreso", action }, orderBy: { createdAt: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  await createInstitution();
  await signUpVerified({ name: "Ana", email: correo, password: clave });
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany({ where: { entity: "Ingreso" } });
});

describe("bloqueo por intentos fallidos", () => {
  it("los primeros cuatro fallos muestran el error de credenciales", async () => {
    for (let i = 0; i < 4; i += 1) {
      const response = await ingresar(fallida);
      expect(response.status).toBe(401);
      expect(response.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    }
  });

  it("el quinto bloquea 15 minutos e informa la hora de liberación", async () => {
    await fallar(4);
    const antes = Date.now();
    const response = await ingresar(fallida);

    expect(response.status).toBe(401);
    expect(mensajeDe(response)).toMatch(
      /^Cuenta bloqueada temporalmente\. Podés volver a intentar a las \d{2}:\d{2}\.$/,
    );
    const { bloqueadoHasta } = (await bloqueo())!;
    expect(bloqueadoHasta!.getTime() - antes).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
    expect(bloqueadoHasta!.getTime() - antes).toBeLessThanOrEqual(15 * 60 * 1000 + 5000);
  });

  it("durante el bloqueo la contraseña correcta no entra y el plazo no se extiende", async () => {
    await fallar(5);
    const { bloqueadoHasta } = (await bloqueo())!;

    const response = await ingresar(clave);

    expect(response.status).toBe(401);
    expect(mensajeDe(response)).toContain("Cuenta bloqueada temporalmente");
    expect((await bloqueo())!.bloqueadoHasta).toEqual(bloqueadoHasta);
    expect(await prisma.session.count()).toBe(0);
  });

  it("pasado el bloqueo la contraseña correcta entra y el contador vuelve a cero", async () => {
    await fallar(5);
    await prisma.bloqueoCuenta.updateMany({
      data: { bloqueadoHasta: new Date(Date.now() - 1000) },
    });

    const response = await ingresar(clave);

    expect(response.status).toBe(200);
    expect(await bloqueo()).toBeNull();
  });

  it("tras el bloqueo el primer fallo vuelve a contar desde uno", async () => {
    await fallar(5);
    await prisma.bloqueoCuenta.updateMany({
      data: { bloqueadoHasta: new Date(Date.now() - 1000) },
    });

    await ingresar(fallida);

    expect(await bloqueo()).toMatchObject({ intentosFallidos: 1, bloqueadoHasta: null });
  });

  it("un ingreso exitoso antes del quinto fallo devuelve los 5 intentos", async () => {
    await fallar(4);
    expect((await ingresar(clave)).status).toBe(200);
    await fallar(4);
    expect((await ingresar(fallida)).status).toBe(401);
    expect(await bloqueo()).toMatchObject({ intentosFallidos: 5 });
  });

  it("un correo inexistente recibe siempre el error genérico", async () => {
    for (let i = 0; i < 6; i += 1) {
      const response = await ingresar(fallida, "nadie@example.com");
      expect(response.status).toBe(401);
    }
  });

  it("el bloqueo no impide crear sesión por otro medio (Google)", async () => {
    await fallar(5);
    const user = await prisma.user.findFirstOrThrow({ where: { email: correo } });
    const context = await auth.$context;

    const session = await context.internalAdapter.createSession(user.id);

    expect(session.userId).toBe(user.id);
  });
});

describe("auditoría de ingresos", () => {
  it("registra ingresos exitosos con usuario, motivo y fecha", async () => {
    await ingresar(clave);

    const [ingreso] = await auditorias("ingreso_exitoso");
    expect(ingreso).toMatchObject({ after: { motivo: "Ingreso exitoso" } });
    expect(ingreso!.userId).not.toBeNull();
    expect(ingreso!.createdAt).toBeInstanceOf(Date);
  });

  it("registra cada fallo y el bloqueo", async () => {
    await fallar(5);
    await ingresar(clave);

    expect(await auditorias("ingreso_fallido")).toHaveLength(6);
    const [bloqueoAuditado] = await auditorias("bloqueo");
    expect(bloqueoAuditado).toMatchObject({
      after: { motivo: "Cinco intentos fallidos consecutivos" },
    });
  });

  it("un correo inexistente se registra con el correo y sin usuario", async () => {
    await ingresar(fallida, "Nadie@Example.com");

    const [fallo] = await auditorias("ingreso_fallido");
    expect(fallo).toMatchObject({ userId: null, after: { email: "nadie@example.com" } });
  });
});

describe("sesión", () => {
  const sesionDe = async () => {
    const response = await ingresar(clave);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    return new Headers({ cookie });
  };

  it("vence a las 8 horas sin uso", async () => {
    const headers = await sesionDe();
    expect(await auth.api.getSession({ headers })).not.toBeNull();

    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it("cada uso renueva el plazo", async () => {
    const headers = await sesionDe();
    const vieja = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.session.updateMany({ data: { expiresAt: vieja } });

    await auth.api.getSession({ headers });

    const { expiresAt } = await prisma.session.findFirstOrThrow();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 7 * 60 * 60 * 1000);
  });

  it("cerrar sesión invalida las demás sesiones de la cuenta", async () => {
    const primera = await sesionDe();
    const segunda = await sesionDe();
    expect(await prisma.session.count()).toBe(2);

    await auth.api.signOut({ headers: primera });

    expect(await prisma.session.count()).toBe(0);
    expect(await auth.api.getSession({ headers: segunda })).toBeNull();
  });
});
