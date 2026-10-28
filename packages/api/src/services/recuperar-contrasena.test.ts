import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import { createInstitution, resetDatabase, signUpVerified } from "../test/db";

import { definirContrasena, solicitarRecuperacion, verificarEnlace } from "./recuperar-contrasena";

const correo = "ana@example.com";
const cuenta = { name: "Ana", email: correo, password: "clave1234" };

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
};

const correosDeRecuperacion = (to = correo) =>
  prisma.emailOutbox.findMany({ where: { to, subject: "Recuperá tu contraseña de SiGA" } });

const enlaces = async () =>
  (await correosDeRecuperacion()).map(
    (email) => /definir-contrasena\?token=([^"&\s]+)/.exec(email.html)?.[1],
  );

const definir = (token: string, contrasena: string) =>
  definirContrasena({ token, contrasena, confirmacion: contrasena });

beforeEach(async () => {
  await resetDatabase();
  await createInstitution();
});

describe("solicitarRecuperacion", () => {
  it("una cuenta activa recibe un enlace que vence en 60 minutos", async () => {
    await signUpVerified(cuenta);
    const now = new Date();

    await solicitarRecuperacion(correo, now);

    const [token] = await enlaces();
    expect(token).toBeTruthy();
    const verification = await prisma.verification.findFirstOrThrow({
      where: { identifier: `reset-password:${token}` },
    });
    expect(verification.expiresAt.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
  });

  it("un correo no registrado no recibe nada y no falla", async () => {
    await solicitarRecuperacion("noexiste@example.com");
    expect(await correosDeRecuperacion("noexiste@example.com")).toHaveLength(0);
  });

  it("una cuenta desactivada no recibe nada", async () => {
    await signUpVerified(cuenta);
    await prisma.userProfile.updateMany({
      where: { user: { email: correo } },
      data: { activo: false },
    });

    await solicitarRecuperacion(correo);

    expect(await correosDeRecuperacion()).toHaveLength(0);
  });

  it("un pedido nuevo no invalida el enlace vigente", async () => {
    await signUpVerified(cuenta);
    await solicitarRecuperacion(correo);
    await solicitarRecuperacion(correo);

    const [primero, segundo] = await enlaces();
    expect(primero).not.toBe(segundo);
    await expect(definir(primero!, "nueva1234")).resolves.toBeUndefined();
  });

  it("pasado el límite por correo responde 429 y no envía otro correo", async () => {
    await signUpVerified(cuenta);
    const now = new Date("2026-10-28T12:00:10.000Z");
    for (let pedido = 0; pedido < 3; pedido += 1) await solicitarRecuperacion(correo, now);

    const error = await rejection(solicitarRecuperacion(correo, now));

    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED" });
    expect(await correosDeRecuperacion()).toHaveLength(3);
  });
});

describe("definirContrasena", () => {
  it("actualiza la contraseña: entra la nueva y la anterior no", async () => {
    await signUpVerified(cuenta);
    await solicitarRecuperacion(correo);
    const [token] = await enlaces();

    await definir(token!, "nueva1234");

    await expect(
      auth.api.signInEmail({ body: { email: correo, password: "nueva1234" } }),
    ).resolves.toBeTruthy();
    await expect(
      auth.api.signInEmail({ body: { email: correo, password: "clave1234" } }),
    ).rejects.toBeTruthy();
  });

  it("el enlace sirve una sola vez", async () => {
    await signUpVerified(cuenta);
    await solicitarRecuperacion(correo);
    const [token] = await enlaces();
    await definir(token!, "nueva1234");

    const error = await rejection(definir(token!, "otra12345"));

    expect(error).toMatchObject({ status: 400, message: "El enlace venció o ya fue usado." });
  });

  it("un enlace vencido o inventado se rechaza igual", async () => {
    await signUpVerified(cuenta);
    await solicitarRecuperacion(correo);
    const [token] = await enlaces();
    await prisma.verification.updateMany({
      where: { identifier: `reset-password:${token}` },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    for (const candidato of [token!, "inventado"]) {
      expect(await rejection(definir(candidato, "nueva1234"))).toMatchObject({
        status: 400,
        message: "El enlace venció o ya fue usado.",
      });
    }
  });

  it("cierra las sesiones abiertas de la cuenta", async () => {
    await signUpVerified(cuenta);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: correo } });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBeGreaterThan(0);
    await solicitarRecuperacion(correo);
    const [token] = await enlaces();

    await definir(token!, "nueva1234");

    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("verificarEnlace", () => {
  it("acepta un enlace vigente y rechaza el usado", async () => {
    await signUpVerified(cuenta);
    await solicitarRecuperacion(correo);
    const [token] = await enlaces();

    await expect(verificarEnlace(token!)).resolves.toBeUndefined();
    await definir(token!, "nueva1234");

    expect(await rejection(verificarEnlace(token!))).toMatchObject({ status: 400 });
  });
});

describe("endpoint HTTP de Better Auth", () => {
  it("el pedido directo de recuperación no existe: solo lo hace el servicio", async () => {
    await signUpVerified(cuenta);

    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: correo }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await correosDeRecuperacion()).toHaveLength(0);
  });
});
