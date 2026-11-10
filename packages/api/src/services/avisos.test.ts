import { prisma } from "@repo/db";
import { segmentoVacio, type CrearAvisoInput, type SegmentoAviso } from "@repo/domain";
import { crearAvisoSchema } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
  authOf,
  countAuditLogs,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
  type TestUser,
} from "../test/db";

import { finalizarAviso, listarAvisos, listarNotificacionesDeAviso, publicarAviso } from "./avisos";
import { crearTokenBajaAvisos, darDeBajaPorCorreo } from "./notificaciones";

let institution: TestOrganization;
let fixture: AcademicFixture;

const minutos = (cantidad: number) => new Date(Date.now() + cantidad * 60_000).toISOString();
const segmento = (parcial: Partial<SegmentoAviso>): SegmentoAviso => ({
  ...segmentoVacio,
  ...parcial,
});

const bedel = () => authOf(institution, institution);

const publicar = (parcial: Partial<CrearAvisoInput> = {}, autor = bedel()) =>
  asOrganization(institution, () =>
    publicarAviso(
      autor,
      crearAvisoSchema.parse({
        titulo: "Corte de luz",
        cuerpo: "Primera línea\nSegunda línea",
        destinatarios: segmento({ todos: true }),
        hasta: minutos(60),
        ...parcial,
      }),
    ),
  );

const vistaDe = (
  usuario: TestUser | TestOrganization,
  vista: "VIGENTES" | "HISTORIAL" | "PUBLICADOS",
) => listarAvisos(authOf(institution, usuario), { vista });

const titulosVigentes = async (usuario: TestUser | TestOrganization) =>
  (await vistaDe(usuario, "VIGENTES")).map((aviso) => aviso.titulo);

const crearEstudiante = async (opciones: { sigue?: boolean; correo?: boolean } = {}) => {
  const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
  await prisma.userProfile.update({
    where: { userId: estudiante.userId },
    data: { notificarAvisosPorCorreo: opciones.correo ?? false },
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

const correos = () => prisma.emailOutbox.findMany({ orderBy: { to: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("permisos", () => {
  it("solo Bedel y Autoridad publican; el resto recibe 403", async () => {
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    expect(await publicar({}, authOf(institution, autoridad))).toMatchObject({
      titulo: "Corte de luz",
    });
    for (const perfil of ["ESTUDIANTE", "DOCENTE"] as const) {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(publicar({}, authOf(institution, usuario))).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it("Publicados y el resultado de envíos son solo de quien publica", async () => {
    const aviso = await publicar();
    const estudiante = await crearEstudiante();
    await expect(vistaDe(estudiante, "PUBLICADOS")).rejects.toMatchObject({ status: 403 });
    await expect(
      listarNotificacionesDeAviso(authOf(institution, estudiante), aviso.id),
    ).rejects.toMatchObject({ status: 403 });
    expect(await vistaDe(institution, "PUBLICADOS")).toHaveLength(1);
  });

  it("el resultado de envíos de un aviso inexistente es 404", async () => {
    await expect(listarNotificacionesDeAviso(bedel(), "no-existe")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("segmentos", () => {
  it("un aviso para todos lo ven todos los perfiles", async () => {
    await publicar();
    for (const perfil of ["ESTUDIANTE", "DOCENTE", "AUTORIDAD"] as const) {
      const usuario = await createUserWithPerfil(institution, perfil);
      expect(await titulosVigentes(usuario)).toEqual(["Corte de luz"]);
    }
  });

  it("por perfil solo lo ve ese perfil", async () => {
    await publicar({ destinatarios: segmento({ perfiles: ["DOCENTE"] }) });
    expect(await titulosVigentes(fixture.docente)).toEqual(["Corte de luz"]);
    expect(await titulosVigentes(await crearEstudiante())).toEqual([]);
    expect(await titulosVigentes(institution)).toEqual([]);
  });

  it("por comisión, carrera o año lo ve quien sigue la comisión y quien la dicta", async () => {
    const sigue = await crearEstudiante({ sigue: true });
    const noSigue = await crearEstudiante();
    for (const destinatarios of [
      segmento({ comisionIds: [fixture.comisionId] }),
      segmento({ carreraIds: [fixture.carreraId] }),
      segmento({ anios: [5] }),
    ]) {
      await resetAvisos();
      await publicar({ destinatarios });
      expect(await titulosVigentes(sigue)).toEqual(["Corte de luz"]);
      expect(await titulosVigentes(fixture.docente)).toEqual(["Corte de luz"]);
      expect(await titulosVigentes(noSigue)).toEqual([]);
    }
  });

  it("otra carrera, otro año u otra comisión no lo alcanzan", async () => {
    const sigue = await crearEstudiante({ sigue: true });
    await publicar({
      destinatarios: segmento({ carreraIds: ["otra"], anios: [1], comisionIds: ["otra"] }),
    });
    expect(await titulosVigentes(sigue)).toEqual([]);
  });
});

const resetAvisos = async () => {
  await prisma.notificacion.deleteMany();
  await prisma.aviso.deleteMany();
};

describe("vigencia", () => {
  it("con desde futuro no se ve hasta que empieza, pero figura en Publicados", async () => {
    await publicar({ desde: minutos(60), hasta: minutos(120) });
    expect(await titulosVigentes(institution)).toEqual([]);
    expect(await vistaDe(institution, "HISTORIAL")).toEqual([]);
    expect(await vistaDe(institution, "PUBLICADOS")).toHaveLength(1);
  });

  it("al vencer pasa de Vigentes a Historial", async () => {
    await publicar();
    const despues = new Date(Date.now() + 2 * 60 * 60_000);
    const auth = bedel();
    expect(await listarAvisos(auth, { vista: "VIGENTES" })).toHaveLength(1);
    expect(await listarAvisos(auth, { vista: "HISTORIAL" })).toHaveLength(0);
    expect(await listarAvisos(auth, { vista: "VIGENTES" }, despues)).toHaveLength(0);
    expect(await listarAvisos(auth, { vista: "HISTORIAL" }, despues)).toHaveLength(1);
  });

  it("los urgentes van primero en Vigentes", async () => {
    await publicar({ titulo: "Normal" });
    await publicar({ titulo: "Urgente", prioridad: "URGENTE" });
    await publicar({ titulo: "Otro normal" });
    expect(await titulosVigentes(institution)).toEqual(["Urgente", "Otro normal", "Normal"]);
  });
});

describe("finalizar", () => {
  it("termina la vigencia ahora: sale de Vigentes y pasa al Historial con quién lo finalizó", async () => {
    const estudiante = await crearEstudiante();
    const aviso = await publicar({ prioridad: "URGENTE" });
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");

    const finalizado = await asOrganization(institution, () =>
      finalizarAviso(authOf(institution, autoridad), aviso.id),
    );

    expect(finalizado.finalizadoPor).toEqual({ id: autoridad.userId, nombre: expect.any(String) });
    expect(finalizado.finalizadoEn).toBe(finalizado.hasta);
    expect(await titulosVigentes(estudiante)).toEqual([]);
    expect((await vistaDe(estudiante, "HISTORIAL")).map((item) => item.id)).toEqual([aviso.id]);
    expect(await countAuditLogs(institution.organizationId, "Aviso")).toBe(2);
  });

  it("un aviso programado a futuro termina sin llegar a mostrarse", async () => {
    const aviso = await publicar({ desde: minutos(60), hasta: minutos(120) });
    const finalizado = await finalizarAviso(bedel(), aviso.id);
    expect(finalizado.desde).toBe(finalizado.hasta);
    expect(
      await listarAvisos(bedel(), { vista: "VIGENTES" }, new Date(Date.now() + 90 * 60_000)),
    ).toEqual([]);
  });

  it("no envía correos", async () => {
    const aviso = await publicar();
    await crearEstudiante({ correo: true });
    await finalizarAviso(bedel(), aviso.id);
    expect(await correos()).toEqual([]);
  });

  it("rechaza un aviso que ya terminó, uno de otra institución y a Docente y Estudiante", async () => {
    const aviso = await publicar();
    const despues = new Date(Date.now() + 2 * 60 * 60_000);
    await expect(finalizarAviso(bedel(), aviso.id, despues)).rejects.toMatchObject({
      status: 422,
      message: "El aviso ya terminó",
    });
    const otra = await createOrganization();
    await expect(finalizarAviso(authOf(otra, otra), aviso.id)).rejects.toMatchObject({
      status: 404,
    });
    for (const perfil of ["ESTUDIANTE", "DOCENTE"] as const) {
      const usuario = await createUserWithPerfil(institution, perfil);
      await expect(finalizarAviso(authOf(institution, usuario), aviso.id)).rejects.toMatchObject({
        status: 403,
      });
    }
  });
});

describe("correo", () => {
  it("sin la opción no manda ningún correo", async () => {
    await publicar();
    expect(await correos()).toHaveLength(0);
    expect(await prisma.notificacion.count()).toBe(0);
  });

  it("manda uno por destinatario; al estudiante solo si activó la opción", async () => {
    const conOpcion = await crearEstudiante({ correo: true });
    await crearEstudiante({ correo: false });
    const aviso = await publicar({ enviarPorCorreo: true, prioridad: "URGENTE" });

    const enviados = await correos();
    expect(enviados.map((correo) => correo.to).sort()).toEqual(
      [institution.userEmail, fixture.docente.userEmail, conOpcion.userEmail].sort(),
    );
    expect(enviados[0]).toMatchObject({ subject: "Aviso urgente: Corte de luz" });
    expect(enviados[0]!.html).toContain("Primera línea");
    expect(enviados[0]!.html).toContain("Segunda línea");
    expect(enviados[0]!.html).toContain("Vigente hasta");
    expect(await prisma.notificacion.count({ where: { avisoId: aviso.id, tipo: "AVISO" } })).toBe(
      3,
    );
  });

  it("el asunto de un aviso normal es 'Aviso institucional: <título>'", async () => {
    await publicar({ enviarPorCorreo: true, destinatarios: segmento({ perfiles: ["BEDEL"] }) });
    expect((await correos()).map((correo) => correo.subject)).toEqual([
      "Aviso institucional: Corte de luz",
    ]);
  });

  it("solo el estudiante lleva el enlace de baja, y el segmento limita los destinatarios", async () => {
    const estudiante = await crearEstudiante({ correo: true, sigue: true });
    await publicar({
      enviarPorCorreo: true,
      destinatarios: segmento({ perfiles: ["BEDEL"], comisionIds: [fixture.comisionId] }),
    });
    const porDestino = Object.fromEntries((await correos()).map((c) => [c.to, c.html]));
    expect(Object.keys(porDestino).sort()).toEqual(
      [institution.userEmail, fixture.docente.userEmail, estudiante.userEmail].sort(),
    );
    expect(porDestino[estudiante.userEmail]).toContain("Dejar de recibir avisos institucionales");
    expect(porDestino[institution.userEmail]).not.toContain("Dejar de recibir");
  });

  it("con desde futuro el correo sale al publicar", async () => {
    await publicar({
      enviarPorCorreo: true,
      desde: minutos(24 * 60),
      hasta: minutos(25 * 60),
      destinatarios: segmento({ perfiles: ["BEDEL"] }),
    });
    expect(await correos()).toHaveLength(1);
  });

  it("escapa el HTML del título y del cuerpo", async () => {
    await publicar({
      enviarPorCorreo: true,
      titulo: "<b>x</b>",
      cuerpo: "<script>alert(1)</script>",
      destinatarios: segmento({ perfiles: ["BEDEL"] }),
    });
    const [correo] = await correos();
    expect(correo!.html).not.toContain("<script>");
    expect(correo!.html).toContain("&lt;script&gt;");
  });
});

describe("resultado de envíos", () => {
  it("lista el estado de cada destinatario", async () => {
    await publicar({ enviarPorCorreo: true, destinatarios: segmento({ perfiles: ["BEDEL"] }) });
    const [aviso] = await vistaDe(institution, "PUBLICADOS");
    expect(await listarNotificacionesDeAviso(bedel(), aviso!.id)).toEqual([
      expect.objectContaining({
        destinatario: expect.objectContaining({ email: institution.userEmail }),
        estado: "PENDING",
      }),
    ]);
    await prisma.emailOutbox.updateMany({ data: { status: "SENT" } });
    expect((await listarNotificacionesDeAviso(bedel(), aviso!.id))[0]!.estado).toBe("SENT");
  });
});

describe("auditoría", () => {
  it("la publicación queda registrada", async () => {
    const aviso = await publicar();
    expect(await countAuditLogs(institution.organizationId, "Aviso")).toBe(1);
    expect(
      await prisma.auditLog.findFirstOrThrow({ where: { entity: "Aviso", entityId: aviso.id } }),
    ).toMatchObject({ action: "create", userId: institution.userId });
  });
});

describe("baja del correo de avisos", () => {
  it("desactiva solo la opción de avisos sin sesión", async () => {
    const estudiante = await crearEstudiante({ correo: true });
    await prisma.userProfile.update({
      where: { userId: estudiante.userId },
      data: { notificarNovedadesPorCorreo: true },
    });
    expect(await darDeBajaPorCorreo(crearTokenBajaAvisos(estudiante.userId))).toBe("avisos");
    expect(
      await prisma.userProfile.findUniqueOrThrow({ where: { userId: estudiante.userId } }),
    ).toMatchObject({ notificarAvisosPorCorreo: false, notificarNovedadesPorCorreo: true });
  });

  it("un token de novedades no sirve para dar de baja avisos y viceversa", async () => {
    const estudiante = await crearEstudiante({ correo: true });
    const token = crearTokenBajaAvisos(estudiante.userId);
    const cruzado = token.replace(/^avisos/, "novedades");
    await expect(darDeBajaPorCorreo(cruzado)).rejects.toMatchObject({ status: 400 });
  });
});
