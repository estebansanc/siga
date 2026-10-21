import { prisma } from "@repo/db";
import { fechaArgentina, sumarDias } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
  authOf,
  createClase,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { crearTokenBajaNovedades, darDeBajaNovedadesPorCorreo } from "./notificaciones";
import { finalizarNovedad, publicarNovedad } from "./novedades";

let institution: TestOrganization;
let fixture: AcademicFixture;
let suscripta: TestUser;
const dia = (offset: number) => sumarDias(fechaArgentina(new Date()), offset);

const crearEstudiante = async (opciones: { sigue: boolean; correo: boolean }) => {
  const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
  await prisma.userProfile.update({
    where: { userId: estudiante.userId },
    data: { notificarNovedadesPorCorreo: opciones.correo },
  });
  if (opciones.sigue) {
    await prisma.comisionSeguida.create({
      data: {
        userId: estudiante.userId,
        comisionId: fixture.comisionId,
        organizationId: institution.organizationId,
      },
    });
  }
  return estudiante;
};

const correos = () => prisma.emailOutbox.findMany({ orderBy: { createdAt: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
  suscripta = await crearEstudiante({ sigue: true, correo: true });
});

const publicar = (claseIds: string[], tipo: "DEMORA" | "AUSENCIA" = "DEMORA") =>
  asOrganization(institution, () =>
    publicarNovedad(authOf(institution, institution), {
      claseIds,
      tipo,
      ...(tipo === "DEMORA" ? { minutosDemora: 15 } : {}),
      mensaje: "Llego tarde",
    }),
  );

describe("correo de novedades", () => {
  it("manda un correo por novedad solo a quien sigue la comisión con la opción activa", async () => {
    await crearEstudiante({ sigue: true, correo: false });
    await crearEstudiante({ sigue: false, correo: true });
    const clase = await createClase(institution, fixture, dia(1));

    const novedad = await publicar([clase.id]);

    const enviados = await correos();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({
      to: suscripta.userEmail,
      subject: "Novedad en Proyecto Final 5K2: Demora",
    });
    expect(enviados[0]!.html).toContain("Demora: 15 minutos");
    expect(enviados[0]!.html).toContain("Mensaje: Llego tarde");
    expect(enviados[0]!.html).toContain("Publicada por: Bedelía");
    expect(await prisma.notificacion.findMany()).toEqual([
      expect.objectContaining({
        destinatarioId: suscripta.userId,
        novedadId: novedad.id,
        tipo: "NOVEDAD",
        emailId: enviados[0]!.id,
      }),
    ]);
  });

  it("una novedad con varias fechas es un solo correo con el rango", async () => {
    const clases = await Promise.all(
      [1, 2, 3].map((n) => createClase(institution, fixture, dia(n))),
    );
    await publicar(clases.map((clase) => clase.id));
    const enviados = await correos();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.html).toContain("Fechas: del");
  });

  it("con varios destinatarios cada Notificacion apunta a su propio correo", async () => {
    const otros = await Promise.all(
      [1, 2, 3].map(() => crearEstudiante({ sigue: true, correo: true })),
    );
    const clase = await createClase(institution, fixture, dia(1));
    await publicar([clase.id]);
    const todos = [suscripta, ...otros];
    const notificaciones = await prisma.notificacion.findMany({ include: { email: true } });
    expect(notificaciones).toHaveLength(todos.length);
    for (const usuario of todos) {
      const propia = notificaciones.find((n) => n.destinatarioId === usuario.userId);
      expect(propia?.email.to).toBe(usuario.userEmail);
    }
  });

  it("Ausencia no lleva línea de dato", async () => {
    const clase = await createClase(institution, fixture, dia(1));
    await publicar([clase.id], "AUSENCIA");
    expect((await correos())[0]!.html).not.toMatch(/Demora:|Aula nueva:|Enlace de la clase:/);
  });

  it("finalizar una novedad o una publicación con error no mandan correos", async () => {
    const clase = await createClase(institution, fixture, dia(1));
    const novedad = await publicar([clase.id]);
    await prisma.emailOutbox.deleteMany();
    await asOrganization(institution, () =>
      finalizarNovedad(authOf(institution, institution), novedad.id),
    );
    await expect(publicar(["no-existe"])).rejects.toMatchObject({ status: 404 });
    expect(await correos()).toHaveLength(0);
  });
});

describe("baja del correo de novedades", () => {
  it("desactiva solo la opción de novedades sin sesión", async () => {
    await prisma.userProfile.update({
      where: { userId: suscripta.userId },
      data: { notificarAvisosPorCorreo: true },
    });
    await darDeBajaNovedadesPorCorreo(crearTokenBajaNovedades(suscripta.userId));
    expect(
      await prisma.userProfile.findUniqueOrThrow({ where: { userId: suscripta.userId } }),
    ).toMatchObject({ notificarNovedadesPorCorreo: false, notificarAvisosPorCorreo: true });
  });

  it("un token alterado es inválido y no cambia nada", async () => {
    const token = crearTokenBajaNovedades(suscripta.userId);
    for (const alterado of [`${token}x`, token.slice(0, -2), "basura", ""]) {
      await expect(darDeBajaNovedadesPorCorreo(alterado)).rejects.toMatchObject({
        status: 400,
        message: "El enlace para dejar de recibir correos no es válido.",
      });
    }
    const otro = crearTokenBajaNovedades("otro-usuario");
    const cruzado = `${otro.split(".")[0]}.${token.split(".")[1]}`;
    await expect(darDeBajaNovedadesPorCorreo(cruzado)).rejects.toMatchObject({ status: 400 });
    expect(
      (await prisma.userProfile.findUniqueOrThrow({ where: { userId: suscripta.userId } }))
        .notificarNovedadesPorCorreo,
    ).toBe(true);
  });
});
