import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authOf,
  createClase,
  createInstitution,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import {
  buscarAulasParaClase,
  crearSolicitudAula,
  listarClasesSolicitables,
  listarMisSolicitudesAula,
} from "./solicitudes-aula";

const fecha = "2026-10-14";
const ahora = new Date(`${fecha}T10:00:00-03:00`);

let institution: TestOrganization;
let fixture: AcademicFixture;

const bedel = () => authOf(institution, institution);
const docente = () => authOf(institution, fixture.docente);
const codigos = (aulas: { codigo: string }[]) => aulas.map((aula) => aula.codigo);

const crearAulaExtra = (codigo: string, capacidad: number, equipamiento: string[] = []) =>
  prisma.aula.create({
    data: {
      organizationId: institution.organizationId,
      codigo,
      edificio: "Edificio C",
      piso: "PB",
      capacidad,
      equipamiento,
    },
  });

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  fixture = await seedAcademicFixture(institution);
});

describe("clases solicitables", () => {
  it("el docente ve solo las clases de sus comisiones y el bedel todas", async () => {
    const propia = await createClase(institution, fixture, fecha);
    const otroDocente = await createUserWithPerfil(institution, "DOCENTE");
    const otraComision = await prisma.comision.create({
      data: {
        organizationId: institution.organizationId,
        materiaId: fixture.materiaId,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo: "5K1",
        turno: "NOCHE",
        anioLectivo: 2026,
        docentes: { create: { docenteId: otroDocente.userId } },
      },
    });
    const ajena = await createClase(
      institution,
      { comisionId: otraComision.id, aulaId: fixture.otraAulaId },
      fecha,
    );

    const delDocente = await listarClasesSolicitables(docente(), fecha, ahora);
    expect(delDocente.clases.map((clase) => clase.id)).toEqual([propia.id]);
    const delBedel = await listarClasesSolicitables(bedel(), fecha, ahora);
    expect(delBedel.clases.map((clase) => clase.id).sort()).toEqual([propia.id, ajena.id].sort());
  });

  it("excluye las terminadas y las Virtual, Suspendida, Ausente o Finalizada", async () => {
    const vigente = await createClase(institution, fixture, fecha, "19:00", "20:00");
    await createClase(institution, fixture, fecha, "06:00", "09:00");
    for (const [indice, estado] of (
      ["VIRTUAL", "SUSPENDIDA", "AUSENTE", "FINALIZADA"] as const
    ).entries()) {
      const clase = await createClase(
        institution,
        fixture,
        fecha,
        `2${indice}:00`,
        `2${indice}:30`,
      );
      await prisma.claseProgramada.update({ where: { id: clase.id }, data: { estado } });
    }
    const { clases } = await listarClasesSolicitables(bedel(), fecha, ahora);
    expect(clases.map((clase) => clase.id)).toEqual([vigente.id]);
  });

  it.each(["ESTUDIANTE", "AUTORIDAD"] as const)("%s no accede", async (perfil) => {
    const usuario = await createUserWithPerfil(institution, perfil);
    const auth = authOf(institution, usuario);
    const clase = await createClase(institution, fixture, fecha);
    await expect(listarClasesSolicitables(auth, fecha, ahora)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      buscarAulasParaClase(auth, { claseId: clase.id, alumnos: 10, recursos: [] }, ahora),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      crearSolicitudAula(
        auth,
        { claseId: clase.id, aulaId: fixture.aulaId, alumnos: 10, recursos: [] },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(listarMisSolicitudesAula(auth)).rejects.toMatchObject({ status: 403 });
  });

  it("un docente no puede operar sobre una clase de otra comisión", async () => {
    const otroDocente = await createUserWithPerfil(institution, "DOCENTE");
    const clase = await createClase(institution, fixture, fecha);
    await expect(
      buscarAulasParaClase(
        authOf(institution, otroDocente),
        { claseId: clase.id, alumnos: 10, recursos: [] },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("búsqueda de aulas", () => {
  it("filtra por capacidad y recursos combinados y ordena de menor a mayor capacidad", async () => {
    await crearAulaExtra("Aula 30", 30, ["Proyector", "Pizarra"]);
    await crearAulaExtra("Aula 50", 50, ["Proyector"]);
    await crearAulaExtra("Aula 55", 55, ["Pizarra"]);
    const clase = await createClase(institution, fixture, fecha, "19:00", "23:00", null);
    const buscar = (
      alumnos: number,
      recursos: Parameters<typeof buscarAulasParaClase>[1]["recursos"],
    ) => buscarAulasParaClase(bedel(), { claseId: clase.id, alumnos, recursos }, ahora);

    expect(codigos((await buscar(40, ["Proyector"])).aulas)).toEqual(["Aula 50", "Aula 12"]);
    expect(codigos((await buscar(40, [])).aulas)).toEqual([
      "Aula 7",
      "Aula 50",
      "Aula 55",
      "Aula 12",
    ]);
    expect(codigos((await buscar(25, ["Proyector", "Pizarra"])).aulas)).toEqual(["Aula 30"]);
  });

  it("no ofrece aulas ocupadas en la franja, fuera de servicio ni dadas de baja", async () => {
    const clase = await createClase(institution, fixture, fecha, "19:00", "23:00", null);
    await createClase(institution, fixture, fecha, "20:00", "21:00", fixture.aulaId);
    await crearAulaExtra("Aula baja", 10).then((aula) =>
      prisma.aula.update({ where: { id: aula.id }, data: { activa: false } }),
    );
    await crearAulaExtra("Aula rota", 10).then((aula) =>
      prisma.aula.update({ where: { id: aula.id }, data: { estado: "FUERA_DE_SERVICIO" } }),
    );
    const { aulas } = await buscarAulasParaClase(
      bedel(),
      { claseId: clase.id, alumnos: 1, recursos: [] },
      ahora,
    );
    expect(codigos(aulas)).toEqual(["Aula 7"]);
  });

  it("sin coincidencias sugiere hasta 5 libres con el criterio que falla, las que fallan menos primero", async () => {
    for (let n = 1; n <= 5; n++) await crearAulaExtra(`Chica ${n}`, 10 * n, ["Proyector"]);
    await crearAulaExtra("Sin todo", 5);
    const clase = await createClase(institution, fixture, fecha, "19:00", "23:00", null);
    const resultado = await buscarAulasParaClase(
      bedel(),
      { claseId: clase.id, alumnos: 100, recursos: ["Proyector"] },
      ahora,
    );
    expect(resultado.aulas).toEqual([]);
    expect(resultado.hayAulasLibres).toBe(true);
    expect(resultado.sugerencias).toHaveLength(5);
    expect(resultado.sugerencias[0]?.faltantes).toEqual(["Capacidad para 100 alumnos"]);
    expect(resultado.sugerencias.every((aula) => aula.faltantes.length === 1)).toBe(true);

    const sinProyector = await buscarAulasParaClase(
      bedel(),
      { claseId: clase.id, alumnos: 50, recursos: ["Proyector"] },
      ahora,
    );
    expect(sinProyector.aulas.map((aula) => aula.codigo)).toEqual(["Chica 5", "Aula 12"]);
  });

  it("informa 'Sin <recurso>' en minúscula y marca cuando no hay aulas libres", async () => {
    const clase = await createClase(institution, fixture, fecha, "19:00", "23:00", null);
    const parcial = await buscarAulasParaClase(
      bedel(),
      { claseId: clase.id, alumnos: 10, recursos: ["Proyector", "Climatizacion"] },
      ahora,
    );
    expect(parcial.sugerencias.find((aula) => aula.codigo === "Aula 7")?.faltantes).toEqual([
      "Sin proyector",
      "Sin climatización",
    ]);

    await createClase(institution, fixture, fecha, "19:30", "22:00", fixture.aulaId);
    await createClase(institution, fixture, fecha, "20:00", "23:00", fixture.otraAulaId);
    const ocupadas = await buscarAulasParaClase(
      bedel(),
      { claseId: clase.id, alumnos: 10, recursos: [] },
      ahora,
    );
    expect(ocupadas).toEqual({ aulas: [], sugerencias: [], hayAulasLibres: false });
  });
});

describe("crear solicitud", () => {
  const pedido = (claseId: string, aulaId: string) => ({
    claseId,
    aulaId,
    alumnos: 40,
    recursos: ["Proyector" as const],
  });

  it("queda Pendiente y la clase conserva su aula si empieza a 30 minutos o más", async () => {
    const clase = await createClase(institution, fixture, fecha, "10:30", "12:00");
    const solicitud = await crearSolicitudAula(
      docente(),
      { ...pedido(clase.id, fixture.otraAulaId), comentario: "Con parlantes" },
      ahora,
    );
    expect(solicitud).toMatchObject({
      estado: "PENDIENTE",
      comentario: "Con parlantes",
      alumnos: 40,
    });
    expect(solicitud.aula.codigo).toBe("Aula 7");
    const actual = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } });
    expect(actual.aulaId).toBe(fixture.aulaId);
  });

  it("con aula asignada queda Pendiente aunque empiece en menos de 30 minutos", async () => {
    const clase = await createClase(institution, fixture, fecha, "10:10", "12:00");
    const solicitud = await crearSolicitudAula(
      docente(),
      pedido(clase.id, fixture.otraAulaId),
      ahora,
    );
    expect(solicitud.estado).toBe("PENDIENTE");
  });

  it("sin aula y a menos de 30 minutos nace Asignada y la clase recibe el aula", async () => {
    const clase = await createClase(institution, fixture, fecha, "10:10", "12:00", null);
    const solicitud = await crearSolicitudAula(
      bedel(),
      pedido(clase.id, fixture.otraAulaId),
      ahora,
    );
    expect(solicitud.estado).toBe("ASIGNADA");
    const actual = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } });
    expect(actual.aulaId).toBe(fixture.otraAulaId);
  });

  it("sin aula y una clase que ya empezó también nace Asignada", async () => {
    const clase = await createClase(institution, fixture, fecha, "09:00", "12:00", null);
    const solicitud = await crearSolicitudAula(docente(), pedido(clase.id, fixture.aulaId), ahora);
    expect(solicitud.estado).toBe("ASIGNADA");
  });

  it("rechaza con 409 si el aula se ocupó antes de asignar y no deja rastros", async () => {
    const clase = await createClase(institution, fixture, fecha, "10:10", "12:00", null);
    await createClase(institution, fixture, fecha, "11:00", "13:00", fixture.otraAulaId);
    await expect(
      crearSolicitudAula(docente(), pedido(clase.id, fixture.otraAulaId), ahora),
    ).rejects.toMatchObject({ status: 409, message: "El aula ya está asignada en esa franja" });
    expect(await prisma.solicitudAula.count()).toBe(0);
    const actual = await prisma.claseProgramada.findUniqueOrThrow({ where: { id: clase.id } });
    expect(actual.aulaId).toBeNull();
  });

  it("rechaza una segunda solicitud mientras la clase tenga una Pendiente", async () => {
    const clase = await createClase(institution, fixture, fecha, "15:00", "17:00");
    await crearSolicitudAula(docente(), pedido(clase.id, fixture.otraAulaId), ahora);
    await expect(
      crearSolicitudAula(bedel(), pedido(clase.id, fixture.aulaId), ahora),
    ).rejects.toMatchObject({
      status: 409,
      message: "Esta clase ya tiene una solicitud pendiente.",
    });
    expect(await prisma.solicitudAula.count()).toBe(1);
  });

  it("dos pedidos simultáneos para la misma clase dejan una sola Pendiente", async () => {
    const clase = await createClase(institution, fixture, fecha, "15:00", "17:00");
    const resultados = await Promise.allSettled([
      crearSolicitudAula(docente(), pedido(clase.id, fixture.otraAulaId), ahora),
      crearSolicitudAula(bedel(), pedido(clase.id, fixture.aulaId), ahora),
    ]);
    expect(resultados.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resultados.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { status: 409, message: "Esta clase ya tiene una solicitud pendiente." },
    });
    expect(await prisma.solicitudAula.count()).toBe(1);
  });

  it("dos clases sin aula que piden la misma aula a la vez: una sola se asigna", async () => {
    const otraComision = await prisma.comision.create({
      data: {
        organizationId: institution.organizationId,
        materiaId: fixture.materiaId,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo: "5K1",
        turno: "NOCHE",
        anioLectivo: 2026,
      },
    });
    const primera = await createClase(institution, fixture, fecha, "10:10", "12:00", null);
    const segunda = await createClase(
      institution,
      { comisionId: otraComision.id, aulaId: null },
      fecha,
      "10:10",
      "12:00",
      null,
    );
    const resultados = await Promise.allSettled(
      [primera, segunda].map((clase) =>
        crearSolicitudAula(bedel(), pedido(clase.id, fixture.otraAulaId), ahora),
      ),
    );
    expect(resultados.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(resultados.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { status: 409, message: "El aula ya está asignada en esa franja" },
    });
    expect(await prisma.claseProgramada.count({ where: { aulaId: fixture.otraAulaId } })).toBe(1);
  });

  it("rechaza clases terminadas, suspendidas y aulas no disponibles", async () => {
    const terminada = await createClase(institution, fixture, fecha, "06:00", "09:00");
    await expect(
      crearSolicitudAula(docente(), pedido(terminada.id, fixture.otraAulaId), ahora),
    ).rejects.toMatchObject({ status: 422 });

    const clase = await createClase(institution, fixture, fecha, "15:00", "17:00");
    await prisma.aula.update({
      where: { id: fixture.otraAulaId },
      data: { estado: "EN_MANTENIMIENTO" },
    });
    await expect(
      crearSolicitudAula(docente(), pedido(clase.id, fixture.otraAulaId), ahora),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      crearSolicitudAula(docente(), pedido(clase.id, "no-existe"), ahora),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("mis solicitudes", () => {
  it("lista solo las propias, las recientes primero, con estado y motivo de rechazo", async () => {
    const primera = await createClase(institution, fixture, fecha, "15:00", "16:00");
    const segunda = await createClase(institution, fixture, fecha, "17:00", "18:00");
    const pedido = (claseId: string) => ({
      claseId,
      aulaId: fixture.otraAulaId,
      alumnos: 20,
      recursos: [],
    });
    const vieja = await crearSolicitudAula(docente(), pedido(primera.id), ahora);
    await crearSolicitudAula(docente(), pedido(segunda.id), ahora);
    await crearSolicitudAula(
      bedel(),
      {
        ...pedido(
          await createClase(institution, fixture, fecha, "18:30", "19:30").then((c) => c.id),
        ),
      },
      ahora,
    );
    await prisma.solicitudAula.update({
      where: { id: vieja.id },
      data: {
        estado: "RECHAZADA",
        motivoRechazo: "Sin aulas libres",
        createdAt: new Date("2026-10-01"),
      },
    });

    const propias = await listarMisSolicitudesAula(docente());
    expect(propias.map((solicitud) => solicitud.estado)).toEqual(["PENDIENTE", "RECHAZADA"]);
    expect(propias[1]).toMatchObject({ motivoRechazo: "Sin aulas libres" });
    expect(propias[0]?.clase).toMatchObject({ materia: "Proyecto Final", comision: "5K2" });
    expect(await listarMisSolicitudesAula(bedel())).toHaveLength(1);
  });
});
