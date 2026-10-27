import { prisma, toDateColumn } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asOrganization,
  authOf,
  createInstitution,
  createOrganization,
  createUserWithPerfil,
  resetDatabase,
  seedAcademicFixture,
  type AcademicFixture,
  type TestOrganization,
} from "../test/db";

import {
  actualizarCarrera,
  actualizarDiaNoLaborable,
  actualizarMateria,
  actualizarComision,
  actualizarHorario,
  actualizarPeriodo,
  crearCarrera,
  crearComision,
  crearDiaNoLaborable,
  crearHorario,
  crearMateria,
  crearPeriodo,
  darDeBajaCarrera,
  darDeBajaComision,
  darDeBajaHorario,
  darDeBajaMateria,
  darDeBajaPeriodo,
  darDeBajaDiaNoLaborable,
  generarClases,
  listarCarrerasGestion,
  listarDocentesAsignables,
  reactivarCarrera,
  reactivarComision,
  reactivarHorario,
  reactivarMateria,
} from "./datos-academicos";
import * as datosAcademicos from "./datos-academicos";

let institution: TestOrganization;
let fixture: AcademicFixture;

const bedel = () => authOf(institution, institution);
const comoBedel = <T>(fn: () => Promise<T>) => asOrganization(institution, fn);

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution();
  // Lunes 19:00–23:00 entre el 4 y el 31 de marzo de 2030: 4 lunes, siempre a futuro.
  fixture = await seedAcademicFixture(institution, { periodo: ["2030-03-04", "2030-03-31"] });
});

const comisionNueva = (codigo: string, docenteIds: string[] = []) =>
  comoBedel(() =>
    crearComision(bedel(), {
      materiaId: fixture.materiaId,
      periodoLectivoId: fixture.periodoLectivoId,
      codigo,
      turno: "NOCHE",
      docenteIds,
    }),
  );

describe("código único", () => {
  it("rechaza el código repetido de carrera y de materia, aunque el original esté de baja", async () => {
    await expect(
      comoBedel(() => crearCarrera(bedel(), { codigo: "K", nombre: "Otra" })),
    ).rejects.toMatchObject({
      status: 409,
      message: "Ya existe una carrera con ese código",
    });
    await expect(
      comoBedel(() =>
        crearMateria(bedel(), {
          carreraId: fixture.carreraId,
          codigo: "K5-PF",
          nombre: "Otra",
          anioCarrera: 1,
        }),
      ),
    ).rejects.toMatchObject({ status: 409, message: "Ya existe una materia con ese código" });

    await prisma.comision.update({ where: { id: fixture.comisionId }, data: { activa: false } });
    await comoBedel(() => darDeBajaMateria(bedel(), fixture.materiaId));
    await comoBedel(() => darDeBajaCarrera(bedel(), fixture.carreraId));
    await expect(
      comoBedel(() => crearCarrera(bedel(), { codigo: "K", nombre: "Otra" })),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it("la comisión es única por materia: otra materia puede repetir el código", async () => {
    await expect(comisionNueva("5K2")).rejects.toMatchObject({
      status: 409,
      message: "Ya existe una comisión con ese código en la materia",
    });
    const otraMateria = await comoBedel(() =>
      crearMateria(bedel(), {
        carreraId: fixture.carreraId,
        codigo: "K5-X",
        nombre: "X",
        anioCarrera: 5,
      }),
    );
    const comision = await comoBedel(() =>
      crearComision(bedel(), {
        materiaId: otraMateria.id,
        periodoLectivoId: fixture.periodoLectivoId,
        codigo: "5K2",
        turno: "TARDE",
        docenteIds: [],
      }),
    );
    expect(comision.codigo).toBe("5K2");
    expect(comision.anioLectivo).toBe(2030);
  });

  it("al editar, repetir el código de otra comisión es 409 y conservar el propio no", async () => {
    const otra = await comisionNueva("5K3");
    await expect(
      comoBedel(() => actualizarComision(bedel(), otra.id, { codigo: "5K2" })),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await comoBedel(() =>
          actualizarComision(bedel(), otra.id, { codigo: "5K3", turno: "TARDE" }),
        )
      ).turno,
    ).toBe("TARDE");
  });
});

describe("períodos", () => {
  it("rechaza editar con un fin que no es posterior al inicio", async () => {
    await expect(
      comoBedel(() =>
        actualizarPeriodo(bedel(), fixture.periodoLectivoId, { fechaFin: "2030-03-04" }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      message: "La fecha de fin debe ser posterior a la de inicio",
    });
    const periodo = await comoBedel(() =>
      crearPeriodo(bedel(), {
        nombre: "2.º cuatrimestre",
        fechaInicio: "2030-08-01",
        fechaFin: "2030-11-30",
      }),
    );
    expect(periodo).toMatchObject({
      fechaInicio: "2030-08-01",
      fechaFin: "2030-11-30",
      activo: true,
    });
  });
});

describe("docentes asignables", () => {
  it("el selector lista solo Docentes no desactivados", async () => {
    const desactivado = await createUserWithPerfil(institution, "DOCENTE");
    await prisma.userProfile.update({
      where: { userId: desactivado.userId },
      data: { activo: false },
    });
    await createUserWithPerfil(institution, "ESTUDIANTE");
    expect(await listarDocentesAsignables(bedel())).toEqual([
      { id: fixture.docente.userId, nombre: fixture.docente.userName },
    ]);
  });

  it("rechaza asignar a quien no es Docente activo y acepta cero o más docentes", async () => {
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const desactivado = await createUserWithPerfil(institution, "DOCENTE");
    await prisma.userProfile.update({
      where: { userId: desactivado.userId },
      data: { activo: false },
    });
    for (const usuario of [estudiante, desactivado, institution]) {
      await expect(comisionNueva("A1", [usuario.userId])).rejects.toMatchObject({ status: 422 });
    }
    expect((await comisionNueva("B1")).docentes).toEqual([]);
    const conDocente = await comisionNueva("C1", [fixture.docente.userId]);
    expect(conDocente.docentes).toEqual([
      { id: fixture.docente.userId, nombre: fixture.docente.userName },
    ]);
    const reemplazada = await comoBedel(() =>
      actualizarComision(bedel(), conDocente.id, { docenteIds: [] }),
    );
    expect(reemplazada.docentes).toEqual([]);
  });
});

describe("horarios y aulas (RF-16)", () => {
  const horarioDe = (
    comisionId: string,
    datos: Partial<{
      diaSemana: number;
      horaInicio: string;
      horaFin: string;
      aulaHabitualId: string | null;
    }> = {},
  ) =>
    comoBedel(() =>
      crearHorario(bedel(), {
        comisionId,
        diaSemana: 1,
        horaInicio: "19:00",
        horaFin: "21:00",
        aulaHabitualId: fixture.aulaId,
        ...datos,
      }),
    );

  it("rechaza un aula ocupada en día, franja y período superpuestos y nombra la comisión que la usa", async () => {
    const otra = await comisionNueva("5K9");
    await expect(
      horarioDe(otra.id, { horaInicio: "22:00", horaFin: "23:30" }),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("la comisión 5K2 de Proyecto Final"),
    });
    expect(await prisma.horario.count({ where: { comisionId: otra.id } })).toBe(0);
  });

  it("permite franjas contiguas, otro día, otra aula o un período que no se superpone", async () => {
    const otra = await comisionNueva("5K9");
    await horarioDe(otra.id, { horaInicio: "23:00", horaFin: "23:59" });
    await horarioDe(otra.id, { diaSemana: 2 });
    await horarioDe(otra.id, { aulaHabitualId: fixture.otraAulaId });
    await horarioDe(otra.id, { aulaHabitualId: null });
    const periodoAparte = await comoBedel(() =>
      crearPeriodo(bedel(), { nombre: "Otro", fechaInicio: "2030-08-01", fechaFin: "2030-11-30" }),
    );
    const comisionAparte = await comoBedel(() =>
      crearComision(bedel(), {
        materiaId: fixture.materiaId,
        periodoLectivoId: periodoAparte.id,
        codigo: "5K8",
        turno: "NOCHE",
        docenteIds: [],
      }),
    );
    await horarioDe(comisionAparte.id);
    expect(await prisma.horario.count()).toBe(6);
  });

  it("al editar valida contra los demás horarios, no contra sí mismo; la baja libera el aula", async () => {
    const otra = await comisionNueva("5K9");
    const propio = await horarioDe(otra.id, { diaSemana: 2 });
    await expect(
      comoBedel(() => actualizarHorario(bedel(), propio.id, { diaSemana: 1 })),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await comoBedel(() => actualizarHorario(bedel(), propio.id, { horaFin: "22:00" })),
    ).toMatchObject({ horaFin: "22:00" });
    await expect(
      comoBedel(() => actualizarHorario(bedel(), propio.id, { horaInicio: "22:00" })),
    ).rejects.toMatchObject({ status: 422 });

    await comoBedel(() => darDeBajaHorario(bedel(), fixture.horarioId));
    expect(
      await comoBedel(() => actualizarHorario(bedel(), propio.id, { diaSemana: 1 })),
    ).toMatchObject({
      diaSemana: 1,
    });
    await expect(
      comoBedel(() => reactivarHorario(bedel(), fixture.horarioId)),
    ).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("bajas con dependientes", () => {
  it("rechaza la baja de carrera, materia y período con dependientes activos y la permite sin ellos", async () => {
    await expect(
      comoBedel(() => darDeBajaCarrera(bedel(), fixture.carreraId)),
    ).rejects.toMatchObject({
      status: 409,
      message: "No se puede dar de baja la carrera: tiene 1 materia activa",
    });
    await expect(
      comoBedel(() => darDeBajaMateria(bedel(), fixture.materiaId)),
    ).rejects.toMatchObject({
      status: 409,
      message: "No se puede dar de baja la materia: tiene 1 comisión activa",
    });
    await expect(
      comoBedel(() => darDeBajaPeriodo(bedel(), fixture.periodoLectivoId)),
    ).rejects.toMatchObject({ status: 409 });

    await comoBedel(() => darDeBajaComision(bedel(), fixture.comisionId));
    await comoBedel(() => darDeBajaMateria(bedel(), fixture.materiaId));
    await comoBedel(() => darDeBajaPeriodo(bedel(), fixture.periodoLectivoId));
    await comoBedel(() => darDeBajaCarrera(bedel(), fixture.carreraId));
    expect(await listarCarrerasGestion(bedel(), false)).toEqual([]);
    expect(await listarCarrerasGestion(bedel(), true)).toEqual([
      expect.objectContaining({ codigo: "K", activa: false }),
    ]);
  });

  it("no reactiva un dependiente bajo un padre dado de baja y no edita lo dado de baja", async () => {
    await comoBedel(() => darDeBajaComision(bedel(), fixture.comisionId));
    await comoBedel(() => darDeBajaMateria(bedel(), fixture.materiaId));
    await expect(
      comoBedel(() => reactivarComision(bedel(), fixture.comisionId)),
    ).rejects.toMatchObject({
      status: 422,
    });
    await comoBedel(() => darDeBajaCarrera(bedel(), fixture.carreraId));
    await expect(
      comoBedel(() => reactivarMateria(bedel(), fixture.materiaId)),
    ).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      comoBedel(() => actualizarCarrera(bedel(), fixture.carreraId, { nombre: "X" })),
    ).rejects.toMatchObject({ status: 422 });
    await comoBedel(() => reactivarCarrera(bedel(), fixture.carreraId));
    await comoBedel(() => reactivarMateria(bedel(), fixture.materiaId));
    expect((await comoBedel(() => reactivarComision(bedel(), fixture.comisionId))).activa).toBe(
      true,
    );
  });
});

describe("generación y bajas de horarios y comisiones", () => {
  const clases = (where = {}) =>
    prisma.claseProgramada.findMany({ where, orderBy: { inicio: "asc" } });

  it("genera desde hoy, regenerar crea 0 y ningún aula queda con clases superpuestas", async () => {
    const resumen = await comoBedel(() =>
      generarClases(bedel(), { periodoLectivoId: fixture.periodoLectivoId }, "2030-03-11"),
    );
    expect(resumen).toEqual({ creadas: 3, existentes: 0, sinAula: 0 });
    expect((await clases()).map((clase) => clase.fecha.toISOString().slice(0, 10))).toEqual([
      "2030-03-11",
      "2030-03-18",
      "2030-03-25",
    ]);
    expect(await comoBedel(() => generarClases(bedel(), {}, "2030-03-11"))).toEqual({
      creadas: 0,
      existentes: 3,
      sinAula: 0,
    });
  });

  it("no genera clases de horarios, comisiones ni días no laborables dados de baja", async () => {
    const dia = await comoBedel(() =>
      crearDiaNoLaborable(bedel(), { fecha: "2030-03-11", motivo: "Feriado" }),
    );
    expect(await comoBedel(() => generarClases(bedel(), {}))).toMatchObject({ creadas: 3 });
    await prisma.claseProgramada.deleteMany();
    await comoBedel(() => darDeBajaDiaNoLaborable(bedel(), dia.id));
    expect(await comoBedel(() => generarClases(bedel(), {}))).toMatchObject({ creadas: 4 });
    await prisma.claseProgramada.deleteMany();
    await comoBedel(() => darDeBajaHorario(bedel(), fixture.horarioId));
    expect(await comoBedel(() => generarClases(bedel(), {}))).toMatchObject({ creadas: 0 });
  });

  it("un día no laborable nuevo no toca las clases ya generadas", async () => {
    await comoBedel(() => generarClases(bedel(), {}));
    await comoBedel(() => crearDiaNoLaborable(bedel(), { fecha: "2030-03-11", motivo: "Feriado" }));
    expect(await clases()).toHaveLength(4);
  });

  it("la baja del horario borra sus clases futuras Programadas sin novedades y conserva el resto", async () => {
    await comoBedel(() => generarClases(bedel(), {}));
    const [primera, segunda, tercera] = await clases();
    await prisma.claseProgramada.update({
      where: { id: primera!.id },
      data: { estado: "SUSPENDIDA" },
    });
    const novedad = await prisma.novedad.create({
      data: {
        organizationId: institution.organizationId,
        comisionId: fixture.comisionId,
        tipo: "DEMORA",
        minutosDemora: 15,
        publicadaPorId: institution.userId,
        clases: { create: { claseId: segunda!.id } },
      },
    });
    await comoBedel(() => darDeBajaHorario(bedel(), fixture.horarioId));
    const restantes = (await clases()).map((clase) => clase.id);
    expect(restantes).toEqual([primera!.id, segunda!.id]);
    expect(restantes).not.toContain(tercera!.id);
    expect(novedad.id).toBeTruthy();
  });

  it("la baja de la comisión borra sus clases futuras Programadas", async () => {
    await comoBedel(() => generarClases(bedel(), {}));
    await comoBedel(() => darDeBajaComision(bedel(), fixture.comisionId));
    expect(await clases()).toHaveLength(0);
  });

  it("editar el horario mueve sus clases al nuevo día, franja y aula", async () => {
    await comoBedel(() => generarClases(bedel(), {}));
    await comoBedel(() =>
      actualizarHorario(bedel(), fixture.horarioId, {
        diaSemana: 2,
        horaInicio: "18:00",
        horaFin: "20:00",
        aulaHabitualId: fixture.otraAulaId,
      }),
    );
    const movidas = await clases();
    expect(movidas.map((clase) => clase.inicio.toISOString())).toEqual([
      "2030-03-05T21:00:00.000Z",
      "2030-03-12T21:00:00.000Z",
      "2030-03-19T21:00:00.000Z",
      "2030-03-26T21:00:00.000Z",
    ]);
    expect(movidas.every((clase) => clase.aulaId === fixture.otraAulaId)).toBe(true);
    expect(await comoBedel(() => generarClases(bedel(), {}))).toMatchObject({
      creadas: 0,
      existentes: 4,
    });
  });

  it("al mover una clase a un día no laborable la quita", async () => {
    await comoBedel(() => generarClases(bedel(), {}));
    await prisma.diaNoLaborable.create({
      data: {
        organizationId: institution.organizationId,
        fecha: toDateColumn("2030-03-12"),
        motivo: "Feriado",
      },
    });
    await comoBedel(() => actualizarHorario(bedel(), fixture.horarioId, { diaSemana: 2 }));
    expect((await clases()).map((clase) => clase.fecha.toISOString().slice(0, 10))).toEqual([
      "2030-03-05",
      "2030-03-19",
      "2030-03-26",
    ]);
  });
});

describe("permisos", () => {
  it("Docente y Estudiante reciben Acceso denegado en las seis entidades, listados incluidos, y queda auditado", async () => {
    const docente = await createUserWithPerfil(institution, "DOCENTE");
    const estudiante = await createUserWithPerfil(institution, "ESTUDIANTE");
    const llamadas = (auth: ReturnType<typeof authOf>) => [
      () => datosAcademicos.listarCarrerasGestion(auth, false),
      () => datosAcademicos.listarMateriasGestion(auth, false),
      () => datosAcademicos.listarPeriodosGestion(auth, false),
      () => datosAcademicos.listarComisionesGestion(auth, false),
      () => datosAcademicos.listarHorariosGestion(auth, { bajas: false }),
      () => datosAcademicos.listarDiasNoLaborablesGestion(auth, false),
      () => datosAcademicos.listarDocentesAsignables(auth),
      () => datosAcademicos.crearCarrera(auth, { codigo: "Z", nombre: "Z" }),
      () => datosAcademicos.darDeBajaCarrera(auth, fixture.carreraId),
      () => datosAcademicos.darDeBajaHorario(auth, fixture.horarioId),
      () => datosAcademicos.darDeBajaPeriodo(auth, fixture.periodoLectivoId),
      () => datosAcademicos.darDeBajaDiaNoLaborable(auth, "x"),
    ];
    for (const usuario of [docente, estudiante]) {
      for (const llamada of llamadas(authOf(institution, usuario))) {
        await expect(llamada()).rejects.toMatchObject({ status: 403, message: "Acceso denegado" });
      }
    }
    expect(await prisma.carrera.count()).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "acceso_denegado" } })).toBe(24);
  });

  it("la Autoridad administra igual que el Bedel", async () => {
    const autoridad = await createUserWithPerfil(institution, "AUTORIDAD");
    const auth = authOf(institution, autoridad);
    const carrera = await asOrganization(
      {
        ...institution,
        actor: { userId: autoridad.userId, organizationId: institution.organizationId },
      },
      () => crearCarrera(auth, { codigo: "Q", nombre: "Química" }),
    );
    expect(carrera.activa).toBe(true);
  });
});

describe("auditoría", () => {
  it("cada alta, edición y baja de las seis entidades queda con usuario y fecha", async () => {
    const periodo = await comoBedel(() =>
      crearPeriodo(bedel(), { nombre: "P", fechaInicio: "2031-01-01", fechaFin: "2031-02-01" }),
    );
    const comision = await comisionNueva("AUD");
    const horario = await comoBedel(() =>
      crearHorario(bedel(), {
        comisionId: comision.id,
        diaSemana: 3,
        horaInicio: "08:00",
        horaFin: "10:00",
        aulaHabitualId: null,
      }),
    );
    const dia = await comoBedel(() =>
      crearDiaNoLaborable(bedel(), { fecha: "2031-01-10", motivo: "Feriado" }),
    );
    const carrera = await comoBedel(() =>
      crearCarrera(bedel(), { codigo: "AUD", nombre: "Auditada" }),
    );
    const materia = await comoBedel(() =>
      crearMateria(bedel(), {
        carreraId: carrera.id,
        codigo: "AUD-M",
        nombre: "M",
        anioCarrera: 1,
      }),
    );
    await comoBedel(() => actualizarCarrera(bedel(), carrera.id, { nombre: "Editada" }));
    await comoBedel(() => darDeBajaMateria(bedel(), materia.id));
    await comoBedel(() => darDeBajaHorario(bedel(), horario.id));
    await comoBedel(() => darDeBajaDiaNoLaborable(bedel(), dia.id));
    await comoBedel(() => darDeBajaPeriodo(bedel(), periodo.id));

    const registros = await prisma.auditLog.findMany({
      where: {
        entity: {
          in: ["Carrera", "Materia", "PeriodoLectivo", "Comision", "Horario", "DiaNoLaborable"],
        },
      },
    });
    const creadas = registros
      .filter((registro) => registro.action === "create")
      .map((registro) => registro.entity);
    expect(creadas).toEqual(
      expect.arrayContaining([
        "Carrera",
        "Materia",
        "PeriodoLectivo",
        "Comision",
        "Horario",
        "DiaNoLaborable",
      ]),
    );
    expect(
      registros.every((registro) => registro.userId === institution.userId && registro.createdAt),
    ).toBe(true);
    const edicion = registros.find(
      (registro) => registro.entity === "Carrera" && registro.action === "update",
    );
    expect(edicion?.before).toMatchObject({ nombre: "Auditada" });
    expect(edicion?.after).toMatchObject({ nombre: "Editada" });
    const bajas = registros.filter(
      (registro) =>
        (registro.action === "update" &&
          (registro.after as { activa?: boolean; activo?: boolean }).activa === false) ||
        (registro.after as { activo?: boolean }).activo === false,
    );
    expect(bajas.map((registro) => registro.entity).sort()).toEqual([
      "DiaNoLaborable",
      "Horario",
      "Materia",
      "PeriodoLectivo",
    ]);
  });
});

describe("integridad de RF-16 al reactivar o mover", () => {
  const horarioDe = (comisionId: string, aulaHabitualId: string | null = fixture.aulaId) =>
    comoBedel(() =>
      crearHorario(bedel(), {
        comisionId,
        diaSemana: 1,
        horaInicio: "19:00",
        horaFin: "23:00",
        aulaHabitualId,
      }),
    );

  it("reactivar una comisión rechaza si otra tomó el aula de sus horarios y nombra a esa comisión", async () => {
    await comoBedel(() => darDeBajaComision(bedel(), fixture.comisionId));
    const otra = await comisionNueva("5K7");
    await horarioDe(otra.id);
    await expect(
      comoBedel(() => reactivarComision(bedel(), fixture.comisionId)),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("la comisión 5K7"),
    });
  });

  it("cambiar el período de una comisión revalida las aulas de sus horarios", async () => {
    const periodoAparte = await comoBedel(() =>
      crearPeriodo(bedel(), { nombre: "Otro", fechaInicio: "2030-08-01", fechaFin: "2030-11-30" }),
    );
    const aparte = await comoBedel(() =>
      crearComision(bedel(), {
        materiaId: fixture.materiaId,
        periodoLectivoId: periodoAparte.id,
        codigo: "5K6",
        turno: "NOCHE",
        docenteIds: [],
      }),
    );
    await horarioDe(aparte.id);
    await expect(
      comoBedel(() =>
        actualizarComision(bedel(), aparte.id, { periodoLectivoId: fixture.periodoLectivoId }),
      ),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining("la comisión 5K2") });
  });

  it("reactivar un horario rechaza si su aula habitual está dada de baja", async () => {
    await comoBedel(() => darDeBajaHorario(bedel(), fixture.horarioId));
    await prisma.aula.update({ where: { id: fixture.aulaId }, data: { activa: false } });
    await expect(
      comoBedel(() => reactivarHorario(bedel(), fixture.horarioId)),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("mover un horario a un día anterior al inicio del período borra esa clase", async () => {
    await resetDatabase();
    institution = await createInstitution();
    // Período desde un miércoles (6 de marzo de 2030); el horario es de los miércoles.
    fixture = await seedAcademicFixture(institution, {
      periodo: ["2030-03-06", "2030-03-31"],
      diaSemana: 3,
    });
    await comoBedel(() => generarClases(bedel(), {}));
    await comoBedel(() => actualizarHorario(bedel(), fixture.horarioId, { diaSemana: 1 }));
    const fechas = (await prisma.claseProgramada.findMany({ orderBy: { inicio: "asc" } })).map(
      (clase) => clase.fecha.toISOString().slice(0, 10),
    );
    expect(fechas).toEqual(["2030-03-11", "2030-03-18", "2030-03-25"]);
  });
});

describe("aislamiento entre organizaciones", () => {
  it("leer, editar o dar de baja con ids de otra organización devuelve 404", async () => {
    const dia = await comoBedel(() =>
      crearDiaNoLaborable(bedel(), { fecha: "2030-03-11", motivo: "Feriado" }),
    );
    const ajena = await createOrganization("ajena");
    const auth = authOf(ajena, ajena);
    const comoAjena = (fn: () => Promise<unknown>) => asOrganization(ajena, fn);
    const intentos: (() => Promise<unknown>)[] = [
      () => actualizarCarrera(auth, fixture.carreraId, { nombre: "X" }),
      () => darDeBajaCarrera(auth, fixture.carreraId),
      () => actualizarMateria(auth, fixture.materiaId, { nombre: "X" }),
      () => darDeBajaMateria(auth, fixture.materiaId),
      () => actualizarPeriodo(auth, fixture.periodoLectivoId, { nombre: "X" }),
      () => darDeBajaPeriodo(auth, fixture.periodoLectivoId),
      () => actualizarComision(auth, fixture.comisionId, { codigo: "X" }),
      () => darDeBajaComision(auth, fixture.comisionId),
      () => actualizarHorario(auth, fixture.horarioId, { horaFin: "22:00" }),
      () => darDeBajaHorario(auth, fixture.horarioId),
      () => actualizarDiaNoLaborable(auth, dia.id, { motivo: "X" }),
      () => darDeBajaDiaNoLaborable(auth, dia.id),
      () =>
        crearMateria(auth, {
          carreraId: fixture.carreraId,
          codigo: "Z",
          nombre: "Z",
          anioCarrera: 1,
        }),
      () =>
        crearHorario(auth, {
          comisionId: fixture.comisionId,
          diaSemana: 2,
          horaInicio: "08:00",
          horaFin: "09:00",
          aulaHabitualId: null,
        }),
    ];
    for (const intento of intentos) {
      await expect(comoAjena(intento)).rejects.toMatchObject({ status: 404 });
    }
    expect(await listarCarrerasGestion(auth, false)).toEqual([]);
    expect(await listarCarrerasGestion(bedel(), false)).toHaveLength(1);
  });
});
