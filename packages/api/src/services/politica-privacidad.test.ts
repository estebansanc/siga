import { prisma } from "@repo/db";
import { mensajeVersionDesactualizada, parrafosDeLaPolitica, perfilSchema } from "@repo/domain";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "../errors";
import {
  authOf,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  type TestOrganization,
} from "../test/db";

import { getMe } from "./me";
import {
  aceptarPolitica,
  obtenerPoliticaVigente,
  tieneAceptacionPendiente,
} from "./politica-privacidad";

let institution: TestOrganization;

const publicarVersion = (version: number) =>
  prisma.politicaPrivacidad.create({
    data: { version, titulo: "Política de privacidad", texto: `Texto de la versión ${version}` },
  });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
});

afterEach(async () => {
  await prisma.aceptacionPolitica.deleteMany();
  await prisma.politicaPrivacidad.deleteMany({ where: { version: { gt: 2 } } });
});

describe("política de privacidad", () => {
  it("la vigente es la versión 2, sin texto de ejemplo y con los 11 temas numerados", async () => {
    const politica = await obtenerPoliticaVigente(authOf(institution, institution));
    expect(politica).toMatchObject({
      version: 2,
      titulo: "Política de privacidad",
      aceptadaEn: null,
    });
    expect(politica.texto).not.toMatch(/ejemplo|lorem/i);
    const subtitulos = politica.texto
      .split("\n\n")
      .filter((parrafo) => /^\d+\. [^.]+$/.test(parrafo));
    expect(subtitulos).toEqual([
      "1. Responsable",
      "2. Datos que tratamos",
      "3. Finalidad",
      "4. Ubicación en el QR",
      "5. Quién ve qué",
      "6. Proveedores",
      "7. Cookies",
      "8. Conservación",
      "9. Tus derechos",
      "10. Órgano de control",
      "11. Cambios",
    ]);
  });

  it("la pantalla separa la versión 2 en 22 párrafos: el subtítulo y el cuerpo de cada tema", async () => {
    const { texto } = await obtenerPoliticaVigente(authOf(institution, institution));
    const parrafos = parrafosDeLaPolitica(texto);

    expect(parrafos).toHaveLength(22);
    expect(parrafos.filter((_, indice) => indice % 2 === 0)).toEqual([
      "1. Responsable",
      "2. Datos que tratamos",
      "3. Finalidad",
      "4. Ubicación en el QR",
      "5. Quién ve qué",
      "6. Proveedores",
      "7. Cookies",
      "8. Conservación",
      "9. Tus derechos",
      "10. Órgano de control",
      "11. Cambios",
    ]);
    expect(parrafos[1]).toContain("UTN");
    expect(parrafos[3]).toMatch(/DNI.*legajo.*IP/s);
    expect(parrafos[11]).toMatch(/Vercel.*Neon.*Cloudflare R2.*Resend.*Google/s);
    expect(parrafos[13]).toContain("8 horas");
  });

  it("quien aceptó la versión 1 queda con la política pendiente", async () => {
    const auth = authOf(institution, institution);
    await prisma.aceptacionPolitica.create({ data: { userId: auth.userId, version: 1 } });

    expect((await getMe(auth)).politicaPendiente).toBe(true);
    expect(await obtenerPoliticaVigente(auth)).toMatchObject({ version: 2, aceptadaEn: null });
  });

  it("aceptar registra la versión y la fecha, y deja de estar pendiente", async () => {
    const auth = authOf(institution, institution);
    expect(await tieneAceptacionPendiente(auth.userId)).toBe(true);
    expect((await getMe(auth)).politicaPendiente).toBe(true);

    const politica = await aceptarPolitica(auth, { version: 2 });

    expect(politica.aceptadaEn).not.toBeNull();
    expect(await tieneAceptacionPendiente(auth.userId)).toBe(false);
    expect((await getMe(auth)).politicaPendiente).toBe(false);
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("aceptar dos veces la misma versión no duplica el registro", async () => {
    const auth = authOf(institution, institution);
    await aceptarPolitica(auth, { version: 2 });
    await aceptarPolitica(auth, { version: 2 });
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("una versión nueva vuelve a quedar pendiente y conserva la aceptación anterior", async () => {
    const auth = authOf(institution, institution);
    await aceptarPolitica(auth, { version: 2 });
    await publicarVersion(3);

    expect(await tieneAceptacionPendiente(auth.userId)).toBe(true);
    expect(await obtenerPoliticaVigente(auth)).toMatchObject({ version: 3, aceptadaEn: null });
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("rechaza con conflicto aceptar una versión que ya no es la vigente y no registra nada", async () => {
    const auth = authOf(institution, institution);
    await publicarVersion(3);

    await expect(aceptarPolitica(auth, { version: 2 })).rejects.toMatchObject({
      status: 409,
      message: mensajeVersionDesactualizada,
    });
    await expect(aceptarPolitica(auth, { version: 2 })).rejects.toBeInstanceOf(ApiError);
    expect(await prisma.aceptacionPolitica.count()).toBe(0);
  });

  it.each(perfilSchema.options)("el perfil %s acepta la vigente", async (perfil) => {
    const usuario = await createUserWithPerfil(institution, perfil);
    const auth = authOf(institution, usuario);

    expect(await tieneAceptacionPendiente(usuario.userId)).toBe(true);
    await aceptarPolitica(auth, { version: 2 });
    expect(await tieneAceptacionPendiente(usuario.userId)).toBe(false);
  });
});
