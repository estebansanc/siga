import { prisma } from "@repo/db";
import { mensajeVersionDesactualizada, perfilSchema } from "@repo/domain";
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
  await prisma.politicaPrivacidad.deleteMany({ where: { version: { gt: 1 } } });
});

describe("política de privacidad", () => {
  it("la versión 1 trae el aviso de ejemplo y de 3 a 5 párrafos", async () => {
    const politica = await obtenerPoliticaVigente(authOf(institution, institution));
    expect(politica).toMatchObject({
      version: 1,
      titulo: "Política de privacidad",
      aceptadaEn: null,
    });
    const parrafos = politica.texto.split("\n\n");
    expect(parrafos[0]).toBe("Texto de ejemplo: esta no es la política definitiva");
    expect(parrafos.length).toBeGreaterThanOrEqual(3);
    expect(parrafos.length).toBeLessThanOrEqual(5);
  });

  it("aceptar registra la versión y la fecha, y deja de estar pendiente", async () => {
    const auth = authOf(institution, institution);
    expect(await tieneAceptacionPendiente(auth.userId)).toBe(true);
    expect((await getMe(auth)).politicaPendiente).toBe(true);

    const politica = await aceptarPolitica(auth, { version: 1 });

    expect(politica.aceptadaEn).not.toBeNull();
    expect(await tieneAceptacionPendiente(auth.userId)).toBe(false);
    expect((await getMe(auth)).politicaPendiente).toBe(false);
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("aceptar dos veces la misma versión no duplica el registro", async () => {
    const auth = authOf(institution, institution);
    await aceptarPolitica(auth, { version: 1 });
    await aceptarPolitica(auth, { version: 1 });
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("una versión nueva vuelve a quedar pendiente y conserva la aceptación anterior", async () => {
    const auth = authOf(institution, institution);
    await aceptarPolitica(auth, { version: 1 });
    await publicarVersion(2);

    expect(await tieneAceptacionPendiente(auth.userId)).toBe(true);
    expect(await obtenerPoliticaVigente(auth)).toMatchObject({ version: 2, aceptadaEn: null });
    expect(await prisma.aceptacionPolitica.count({ where: { userId: auth.userId } })).toBe(1);
  });

  it("rechaza con conflicto aceptar una versión que ya no es la vigente y no registra nada", async () => {
    const auth = authOf(institution, institution);
    await publicarVersion(2);

    await expect(aceptarPolitica(auth, { version: 1 })).rejects.toMatchObject({
      status: 409,
      message: mensajeVersionDesactualizada,
    });
    await expect(aceptarPolitica(auth, { version: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(await prisma.aceptacionPolitica.count()).toBe(0);
  });

  it.each(perfilSchema.options)("el perfil %s acepta la vigente", async (perfil) => {
    const usuario = await createUserWithPerfil(institution, perfil);
    const auth = authOf(institution, usuario);

    expect(await tieneAceptacionPendiente(usuario.userId)).toBe(true);
    await aceptarPolitica(auth, { version: 1 });
    expect(await tieneAceptacionPendiente(usuario.userId)).toBe(false);
  });
});
