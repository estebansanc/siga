import { prisma } from "@repo/db";
import { fechaArgentina, presenciaInicial, type RegistroQrInput } from "@repo/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  asOrganization,
  authOf,
  countAuditLogs,
  createClase,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import {
  purgarIntentosFallidos,
  registrarAsistenciaManual,
  registrarAsistenciaQr,
} from "./asistencias";
import type * as Auditoria from "./auditoria";
import { generarQr } from "./qr";
import { updateSettings } from "./settings";

const auditoria = vi.hoisted(() => ({ fallar: false }));
vi.mock("./auditoria", async (importOriginal) => {
  const original = await importOriginal<typeof Auditoria>();
  return {
    ...original,
    registrarCambioMasivo: (...args: Parameters<typeof original.registrarCambioMasivo>) => {
      if (auditoria.fallar) throw new Error("falla de auditoría");
      return original.registrarCambioMasivo(...args);
    },
  };
});

let institution: TestOrganization;
let fixture: AcademicFixture;
const hoy = fechaArgentina(new Date());
const a = (hora: string) => new Date(`${hoy}T${hora}:00-03:00`);
const ipDeLaRed = "200.45.10.7";
const enLaSede = {
  latitud: presenciaInicial.latitud,
  longitud: presenciaInicial.longitud,
  precisionMetros: 15,
};
const lejos = { latitud: -26.9, longitud: -65.2, precisionMetros: 15 };

const bedel = () => authOf(institution, institution);
const emitir = async (instante: Date) =>
  (
    await asOrganization(institution, () =>
      generarQr(bedel(), { aulaId: fixture.aulaId, turno: "NOCHE", fecha: hoy }, instante),
    )
  ).token;
const escanear = (
  token: string,
  instante: Date,
  extra: Partial<RegistroQrInput> = {},
  ip = "local",
  usuario: TestUser = fixture.docente,
) =>
  asOrganization(institution, () =>
    registrarAsistenciaQr(authOf(institution, usuario), { token, ...extra }, ip, instante),
  );
const estadoDe = async (claseId: string) =>
  (await prisma.claseProgramada.findUniqueOrThrow({ where: { id: claseId } })).estado;
const fallos = () => prisma.intentoAsistenciaFallido.count();

beforeEach(async () => {
  auditoria.fallar = false;
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("registro de asistencia por QR", () => {
  it("registra con método QR por ubicación, pasa la clase a Docente presente y queda auditado", async () => {
    const clase = await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));

    const { resultado, creada } = await escanear(token, a("19:10"), { ubicacion: enLaSede });

    expect(creada).toBe(true);
    expect(resultado).toMatchObject({
      yaRegistrada: false,
      validacion: "UBICACION",
      turno: "NOCHE",
      aula: { id: fixture.aulaId },
      asistencia: {
        metodo: "QR",
        horaLlegada: "19:10",
        motivo: null,
        docente: { id: fixture.docente.userId },
        registradaPor: { id: fixture.docente.userId },
      },
    });
    expect(await estadoDe(clase.id)).toBe("DOCENTE_PRESENTE");
    const guardada = await prisma.asistenciaDocente.findFirstOrThrow();
    expect(guardada).toMatchObject({ metodo: "QR", validacion: "UBICACION", claseId: clase.id });
    expect(JSON.stringify(guardada)).not.toContain(String(enLaSede.latitud));
    expect(await countAuditLogs(institution.organizationId, "AsistenciaDocente")).toBe(1);
    expect(await fallos()).toBe(0);
  });

  it("sin ubicación valida por la red institucional configurada", async () => {
    await updateSettings(institution.organizationId, {
      presencia: { ...presenciaInicial, redes: ["200.45.10.0/24"] },
    });
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));

    const { resultado } = await escanear(token, a("19:10"), {}, ipDeLaRed);

    expect(resultado.validacion).toBe("RED");
    expect((await prisma.asistenciaDocente.findFirstOrThrow()).validacion).toBe("RED");
  });

  it("fuera del radio y de la red no registra y pide el registro manual", async () => {
    const clase = await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));

    await expect(
      escanear(token, a("19:10"), { ubicacion: lejos }, ipDeLaRed),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("Pedí el registro manual al bedel"),
    });
    expect(await prisma.asistenciaDocente.count()).toBe(0);
    expect(await estadoDe(clase.id)).toBe("PROGRAMADA");
    expect(await fallos()).toBe(1);
  });

  it("una precisión peor que el radio cuenta como ubicación fallida", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    await expect(
      escanear(token, a("19:10"), { ubicacion: { ...enLaSede, precisionMetros: 500 } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("un intento fallido no consume el código: reintentando adentro se registra", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    await expect(escanear(token, a("19:10"), { ubicacion: lejos })).rejects.toMatchObject({
      status: 422,
    });
    const { creada } = await escanear(token, a("19:10"), { ubicacion: enLaSede });
    expect(creada).toBe(true);
  });

  it("un código vencido, alterado, desconocido o de otra fecha da error de código inválido", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    const [contenido, firma] = token.split(".");
    const alterado = `${contenido}.${firma!.slice(0, -2)}${firma!.endsWith("AA") ? "BB" : "AA"}`;
    const ubicacion = { ubicacion: enLaSede };

    for (const [codigo, instante] of [
      [token, a("19:12")],
      [alterado, a("19:10")],
      ["no-es-un-qr", a("19:10")],
    ] as const) {
      await expect(escanear(codigo, instante, ubicacion)).rejects.toMatchObject({
        status: 422,
        message: expect.stringContaining("El código QR no es válido o ya venció"),
      });
    }
    const manana = fechaArgentina(new Date(a("12:00").getTime() + 24 * 3_600_000));
    await createClase(institution, fixture, manana, "19:00", "23:00");
    const deManana = (
      await asOrganization(institution, () =>
        generarQr(bedel(), { aulaId: fixture.aulaId, turno: "NOCHE", fecha: manana }, a("19:10")),
      )
    ).token;
    await expect(escanear(deManana, a("19:10"), ubicacion)).rejects.toMatchObject({ status: 422 });
    expect(await prisma.asistenciaDocente.count()).toBe(0);
  });

  it("un código ya usado por el mismo docente da error de código inválido", async () => {
    await createClase(institution, fixture, hoy, "19:00", "20:00");
    await createClase(institution, fixture, hoy, "20:15", "21:00");
    const token = await emitir(a("19:10"));
    await escanear(token, a("19:10"), { ubicacion: enLaSede });

    await expect(escanear(token, a("19:10"), { ubicacion: enLaSede })).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("El código QR no es válido"),
    });
    expect(await prisma.asistenciaDocente.count()).toBe(1);
  });

  it("sin clase del docente en ese aula y turno da el error de sin clase", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const ajeno = await createUserWithPerfil(institution, "DOCENTE");
    const token = await emitir(a("19:10"));

    await expect(
      escanear(token, a("19:10"), { ubicacion: enLaSede }, "local", ajeno),
    ).rejects.toMatchObject({
      status: 422,
      message: "No tenés una clase en esta aula y turno.",
    });
    expect(await fallos()).toBe(1);
  });

  it("no considera clases suspendidas, virtuales ni de otra aula", async () => {
    const suspendida = await createClase(institution, fixture, hoy, "19:00", "20:00");
    await prisma.claseProgramada.update({
      where: { id: suspendida.id },
      data: { estado: "SUSPENDIDA" },
    });
    const virtual = await createClase(institution, fixture, hoy, "20:00", "21:00");
    await prisma.claseProgramada.update({
      where: { id: virtual.id },
      data: { modalidad: "VIRTUAL" },
    });
    await createClase(institution, fixture, hoy, "21:00", "22:00", fixture.otraAulaId);
    await createClase(institution, fixture, hoy, "22:00", "23:00");
    const token = await emitir(a("19:10"));

    const { resultado } = await escanear(token, a("19:10"), { ubicacion: enLaSede });
    expect(resultado.asistencia.llegadaEn).toBeDefined();
    expect((await prisma.asistenciaDocente.findFirstOrThrow()).claseId).not.toBe(suspendida.id);
    expect(await estadoDe(virtual.id)).toBe("PROGRAMADA");
  });

  it("con dos clases registra la que está en curso", async () => {
    const primera = await createClase(institution, fixture, hoy, "19:00", "20:00");
    const segunda = await createClase(institution, fixture, hoy, "20:15", "21:00");
    const token = await emitir(a("19:30"));

    await escanear(token, a("19:30"), { ubicacion: enLaSede });

    expect(await estadoDe(primera.id)).toBe("DOCENTE_PRESENTE");
    expect(await estadoDe(segunda.id)).toBe("PROGRAMADA");
  });

  it("si ninguna está en curso registra la próxima", async () => {
    const primera = await createClase(institution, fixture, hoy, "19:00", "20:00");
    const segunda = await createClase(institution, fixture, hoy, "20:15", "21:00");
    const token = await emitir(a("20:10"));

    await escanear(token, a("20:10"), { ubicacion: enLaSede });

    expect(await estadoDe(segunda.id)).toBe("DOCENTE_PRESENTE");
    expect(await estadoDe(primera.id)).toBe("FINALIZADA");
  });

  it("una clase ya registrada a mano muestra el registro sin duplicarlo ni contar como fallo", async () => {
    const clase = await createClase(institution, fixture, hoy, "19:00", "23:00");
    await asOrganization(institution, () =>
      registrarAsistenciaManual(
        bedel(),
        {
          claseId: clase.id,
          docenteId: fixture.docente.userId,
          horaLlegada: "19:02",
          motivo: "Sin batería",
        },
        a("19:05"),
      ),
    );
    const token = await emitir(a("19:10"));

    const { resultado, creada } = await escanear(token, a("19:10"), { ubicacion: lejos });

    expect(creada).toBe(false);
    expect(resultado).toMatchObject({
      yaRegistrada: true,
      asistencia: { metodo: "MANUAL", horaLlegada: "19:02" },
    });
    expect(await prisma.asistenciaDocente.count()).toBe(1);
    expect(await fallos()).toBe(0);
  });

  it("de dos escaneos simultáneos con códigos distintos solo uno crea la asistencia", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const primero = await emitir(a("19:10"));
    const segundo = await emitir(a("19:10"));

    const resultados = await Promise.all([
      escanear(primero, a("19:10"), { ubicacion: enLaSede }),
      escanear(segundo, a("19:10"), { ubicacion: enLaSede }),
    ]);

    expect(resultados.filter(({ creada }) => creada)).toHaveLength(1);
    expect(resultados.filter(({ resultado }) => resultado.yaRegistrada)).toHaveLength(1);
    expect(await prisma.asistenciaDocente.count()).toBe(1);
  });

  it("es todo o nada: si falla la auditoría se revierte el cambio de estado", async () => {
    const clase = await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    auditoria.fallar = true;

    await expect(escanear(token, a("19:10"), { ubicacion: enLaSede })).rejects.toThrow(
      "falla de auditoría",
    );

    expect(await estadoDe(clase.id)).toBe("PROGRAMADA");
    expect(await prisma.asistenciaDocente.count()).toBe(0);
    auditoria.fallar = false;
    expect((await escanear(token, a("19:10"), { ubicacion: enLaSede })).creada).toBe(true);
  });

  it("rechaza el token de otra institución", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    const otra = await createOrganization("otra");
    await expect(
      asOrganization(otra, () =>
        registrarAsistenciaQr(
          { ...authOf(otra, fixture.docente), organizationId: otra.organizationId },
          { token },
          "local",
          a("19:10"),
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it.each(["BEDEL", "ESTUDIANTE", "AUTORIDAD"] as const)(
    "rechaza al perfil %s y audita el acceso denegado",
    async (perfil) => {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(escanear("x", a("19:10"), {}, "local", usuario)).rejects.toMatchObject({
        status: 403,
      });
      expect(await countAuditLogs(institution.organizationId, "Permiso")).toBe(1);
      expect(await fallos()).toBe(0);
    },
  );
});

describe("límite de intentos fallidos (SEG-9)", () => {
  const fallar = (instante: Date, usuario = fixture.docente) =>
    escanear("codigo-malo", instante, {}, "local", usuario);

  it("tras 10 fallos en 15 minutos bloquea 15 minutos y avisa a qué hora se libera", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    for (let i = 0; i < 9; i++) {
      await expect(fallar(a(`19:0${i}`))).rejects.toMatchObject({ status: 422 });
    }

    await expect(fallar(a("19:09"))).rejects.toMatchObject({
      status: 429,
      code: "ATTEMPTS_BLOCKED",
      message:
        "Superaste los 10 intentos fallidos. No podés volver a escanear hasta que pasen 15 minutos: se libera a las 19:24.",
    });
    const token = await emitir(a("19:10"));
    await expect(escanear(token, a("19:12"), { ubicacion: enLaSede })).rejects.toMatchObject({
      status: 429,
      code: "ATTEMPTS_BLOCKED",
    });
    expect(await fallos()).toBe(10);
    expect(await prisma.asistenciaDocente.count()).toBe(0);
  });

  it("el bloqueo dura 15 minutos desde el último fallo, no desde el primero", async () => {
    for (let i = 0; i < 10; i++) await fallar(a(`19:0${i}`)).catch(() => undefined);
    for (const hora of ["19:15", "19:16", "19:23"]) {
      await expect(fallar(a(hora))).rejects.toMatchObject({
        status: 429,
        code: "ATTEMPTS_BLOCKED",
      });
    }
    await expect(fallar(a("19:24"))).rejects.toMatchObject({ status: 422 });
  });

  it("purga los intentos de más de 30 minutos", async () => {
    await fallar(a("19:00")).catch(() => undefined);
    await fallar(a("19:50")).catch(() => undefined);
    expect(await purgarIntentosFallidos(a("19:20"))).toBe(0);
    expect(await purgarIntentosFallidos(a("19:50"))).toBe(1);
    expect(await fallos()).toBe(1);
  });

  it("sin ubicación ni red el mensaje habla del permiso de ubicación", async () => {
    await createClase(institution, fixture, hoy, "19:00", "23:00");
    const token = await emitir(a("19:10"));
    await expect(escanear(token, a("19:10"), {})).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("Habilitá el permiso de ubicación"),
    });
  });

  it("a los 15 minutos del último fallo vuelve a poder escanear", async () => {
    const clase = await createClase(institution, fixture, hoy, "19:00", "23:00");
    for (let i = 0; i < 10; i++) await fallar(a(`19:0${i}`)).catch(() => undefined);
    const token = await emitir(a("19:30"));

    const { creada } = await escanear(token, a("19:25"), { ubicacion: enLaSede });

    expect(creada).toBe(true);
    expect(await estadoDe(clase.id)).toBe("DOCENTE_PRESENTE");
  });

  it("es por usuario: otro docente no queda bloqueado", async () => {
    for (let i = 0; i < 10; i++) await fallar(a(`19:0${i}`)).catch(() => undefined);
    const otro = await createUserWithPerfil(institution, "DOCENTE");
    await expect(fallar(a("19:10"), otro)).rejects.toMatchObject({ status: 422 });
  });

  it("los fallos fuera de la ventana de 15 minutos no cuentan", async () => {
    for (let i = 0; i < 9; i++) await fallar(a(`18:0${i}`)).catch(() => undefined);
    await expect(fallar(a("19:00"))).rejects.toMatchObject({ status: 422 });
  });
});
