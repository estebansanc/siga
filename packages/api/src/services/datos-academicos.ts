import type { AuthContext } from "@repo/auth";
import {
  borrarClasesFuturas,
  fromDateColumn,
  generarClasesProgramadas,
  prisma,
  reubicarClasesFuturas,
  toDateColumn,
  type Prisma,
} from "@repo/db";
import {
  finPosteriorAlInicio,
  nombreDiaSemana,
  type ActualizarCarrera,
  type ActualizarComision,
  type ActualizarDiaNoLaborable,
  type ActualizarHorario,
  type ActualizarMateria,
  type ActualizarPeriodo,
  type BuscarComisionesQuery,
  type CrearCarrera,
  type CrearComision,
  type CrearDiaNoLaborable,
  type CrearHorario,
  type CrearMateria,
  type CrearPeriodo,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type {
  AulaDto,
  CarreraDto,
  CarreraGestionDto,
  ComisionDto,
  ComisionGestionDto,
  DiaNoLaborableGestionDto,
  DocenteAsignableDto,
  GeneracionClasesDto,
  HorarioGestionDto,
  MateriaDto,
  MateriaGestionDto,
  PeriodoGestionDto,
} from "../schemas";

import { assertPerfil } from "./permisos";

export const listarCarreras = async (organizationId: string): Promise<CarreraDto[]> =>
  prisma.carrera.findMany({
    where: { organizationId, activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, codigo: true, nombre: true },
  });

export const listarMaterias = async (
  organizationId: string,
  filtro: { carreraId?: string; anio?: number },
): Promise<MateriaDto[]> =>
  prisma.materia.findMany({
    where: { organizationId, activa: true, carreraId: filtro.carreraId, anioCarrera: filtro.anio },
    orderBy: [{ anioCarrera: "asc" }, { nombre: "asc" }],
    select: { id: true, codigo: true, nombre: true, anioCarrera: true, carreraId: true },
  });

export const comisionInclude = {
  materia: { include: { carrera: true } },
  docentes: { include: { docente: { select: { id: true, name: true } } } },
} satisfies Prisma.ComisionInclude;

type ComisionConDatos = Prisma.ComisionGetPayload<{ include: typeof comisionInclude }>;

export const toComisionDto = (comision: ComisionConDatos): ComisionDto => ({
  id: comision.id,
  codigo: comision.codigo,
  turno: comision.turno,
  anioLectivo: comision.anioLectivo,
  materia: {
    id: comision.materia.id,
    codigo: comision.materia.codigo,
    nombre: comision.materia.nombre,
    anioCarrera: comision.materia.anioCarrera,
    carreraId: comision.materia.carreraId,
  },
  carrera: {
    id: comision.materia.carrera.id,
    codigo: comision.materia.carrera.codigo,
    nombre: comision.materia.carrera.nombre,
  },
  docentes: comision.docentes.map(({ docente }) => ({ id: docente.id, nombre: docente.name })),
});

export const buscarComisiones = async (
  organizationId: string,
  query: BuscarComisionesQuery,
): Promise<ComisionDto[]> => {
  const comisiones = await prisma.comision.findMany({
    where: {
      organizationId,
      activa: true,
      materiaId: query.materiaId,
      materia: { activa: true, carreraId: query.carreraId, anioCarrera: query.anio },
    },
    include: comisionInclude,
    orderBy: [
      { materia: { anioCarrera: "asc" } },
      { materia: { nombre: "asc" } },
      { codigo: "asc" },
    ],
  });
  return comisiones.map(toComisionDto);
};

// RF-13: genera las clases del período (o de una comisión) a partir de los horarios.
export const generarClases = async (
  auth: AuthContext,
  filtro: { periodoLectivoId?: string; comisionId?: string },
  hoy?: string,
): Promise<GeneracionClasesDto> => {
  const organizationId = await gestor(auth);
  return generarClasesProgramadas(
    prisma,
    organizationId,
    { ...filtro, usuarioId: auth.userId },
    hoy,
  );
};

// ---------- Administración (RF-13): Bedel y Autoridad ----------

const gestor = async (auth: AuthContext) => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  return auth.organizationId;
};

const excluyendo = (id?: string) => (id ? { id: { not: id } } : {});

const assertCambioDeEstado = (actual: boolean, activa: boolean, entidad: string) => {
  if (actual === activa) throw conflict(`${entidad} ya está ${activa ? "activa" : "dada de baja"}`);
};

const assertEditable = (activa: boolean, entidad: string) => {
  if (!activa) throw unprocessable(`${entidad} está dada de baja: reactivala para editarla`);
};

const assertSinDependientes = (
  cantidad: number,
  entidad: string,
  [singular, plural]: [string, string],
) => {
  if (cantidad > 0) {
    throw conflict(
      `No se puede dar de baja ${entidad}: tiene ${cantidad} ${cantidad === 1 ? singular : plural}`,
    );
  }
};

// Carreras

const carreraSelect = { id: true, codigo: true, nombre: true, activa: true } as const;

const buscarCarrera = async (organizationId: string, id: string) => {
  const carrera = await prisma.carrera.findFirst({ where: { id, organizationId } });
  if (!carrera) throw notFound("Carrera");
  return carrera;
};

const assertCodigoCarreraLibre = async (organizationId: string, codigo: string, id?: string) => {
  const existente = await prisma.carrera.findFirst({
    where: { organizationId, codigo, ...excluyendo(id) },
    select: { id: true },
  });
  if (existente) throw conflict("Ya existe una carrera con ese código");
};

export const listarCarrerasGestion = async (
  auth: AuthContext,
  bajas: boolean,
): Promise<CarreraGestionDto[]> =>
  prisma.carrera.findMany({
    where: { organizationId: await gestor(auth), activa: !bajas },
    orderBy: { nombre: "asc" },
    select: carreraSelect,
  });

export const crearCarrera = async (
  auth: AuthContext,
  input: CrearCarrera,
): Promise<CarreraGestionDto> => {
  const organizationId = await gestor(auth);
  await assertCodigoCarreraLibre(organizationId, input.codigo);
  return prisma.carrera.create({ data: { organizationId, ...input }, select: carreraSelect });
};

export const actualizarCarrera = async (
  auth: AuthContext,
  id: string,
  input: ActualizarCarrera,
): Promise<CarreraGestionDto> => {
  const organizationId = await gestor(auth);
  assertEditable((await buscarCarrera(organizationId, id)).activa, "La carrera");
  if (input.codigo !== undefined) await assertCodigoCarreraLibre(organizationId, input.codigo, id);
  return prisma.carrera.update({ where: { id }, data: input, select: carreraSelect });
};

export const darDeBajaCarrera = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const carrera = await buscarCarrera(organizationId, id);
  assertCambioDeEstado(carrera.activa, false, "La carrera");
  assertSinDependientes(
    await prisma.materia.count({ where: { carreraId: id, activa: true } }),
    "la carrera",
    ["materia activa", "materias activas"],
  );
  return prisma.carrera.update({ where: { id }, data: { activa: false }, select: carreraSelect });
};

export const reactivarCarrera = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  assertCambioDeEstado((await buscarCarrera(organizationId, id)).activa, true, "La carrera");
  return prisma.carrera.update({ where: { id }, data: { activa: true }, select: carreraSelect });
};

// Materias

const materiaGestionInclude = {
  carrera: { select: carreraSelect },
} satisfies Prisma.MateriaInclude;

type MateriaConCarrera = Prisma.MateriaGetPayload<{ include: typeof materiaGestionInclude }>;

const toMateriaGestionDto = (materia: MateriaConCarrera): MateriaGestionDto => ({
  id: materia.id,
  codigo: materia.codigo,
  nombre: materia.nombre,
  anioCarrera: materia.anioCarrera,
  carreraId: materia.carreraId,
  activa: materia.activa,
  carrera: {
    id: materia.carrera.id,
    codigo: materia.carrera.codigo,
    nombre: materia.carrera.nombre,
  },
});

const buscarMateria = async (organizationId: string, id: string) => {
  const materia = await prisma.materia.findFirst({ where: { id, organizationId } });
  if (!materia) throw notFound("Materia");
  return materia;
};

const assertCarreraActiva = async (organizationId: string, carreraId: string) => {
  const carrera = await buscarCarrera(organizationId, carreraId);
  if (!carrera.activa) throw unprocessable("La carrera está dada de baja");
};

const assertCodigoMateriaLibre = async (organizationId: string, codigo: string, id?: string) => {
  const existente = await prisma.materia.findFirst({
    where: { organizationId, codigo, ...excluyendo(id) },
    select: { id: true },
  });
  if (existente) throw conflict("Ya existe una materia con ese código");
};

export const listarMateriasGestion = async (
  auth: AuthContext,
  bajas: boolean,
): Promise<MateriaGestionDto[]> => {
  const materias = await prisma.materia.findMany({
    where: { organizationId: await gestor(auth), activa: !bajas },
    orderBy: [{ carrera: { nombre: "asc" } }, { anioCarrera: "asc" }, { nombre: "asc" }],
    include: materiaGestionInclude,
  });
  return materias.map(toMateriaGestionDto);
};

export const crearMateria = async (
  auth: AuthContext,
  input: CrearMateria,
): Promise<MateriaGestionDto> => {
  const organizationId = await gestor(auth);
  await assertCarreraActiva(organizationId, input.carreraId);
  await assertCodigoMateriaLibre(organizationId, input.codigo);
  return toMateriaGestionDto(
    await prisma.materia.create({
      data: { organizationId, ...input },
      include: materiaGestionInclude,
    }),
  );
};

export const actualizarMateria = async (
  auth: AuthContext,
  id: string,
  input: ActualizarMateria,
): Promise<MateriaGestionDto> => {
  const organizationId = await gestor(auth);
  assertEditable((await buscarMateria(organizationId, id)).activa, "La materia");
  if (input.carreraId !== undefined) await assertCarreraActiva(organizationId, input.carreraId);
  if (input.codigo !== undefined) await assertCodigoMateriaLibre(organizationId, input.codigo, id);
  return toMateriaGestionDto(
    await prisma.materia.update({ where: { id }, data: input, include: materiaGestionInclude }),
  );
};

export const darDeBajaMateria = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  assertCambioDeEstado((await buscarMateria(organizationId, id)).activa, false, "La materia");
  assertSinDependientes(
    await prisma.comision.count({ where: { materiaId: id, activa: true } }),
    "la materia",
    ["comisión activa", "comisiones activas"],
  );
  return toMateriaGestionDto(
    await prisma.materia.update({
      where: { id },
      data: { activa: false },
      include: materiaGestionInclude,
    }),
  );
};

export const reactivarMateria = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const materia = await buscarMateria(organizationId, id);
  assertCambioDeEstado(materia.activa, true, "La materia");
  await assertCarreraActiva(organizationId, materia.carreraId);
  return toMateriaGestionDto(
    await prisma.materia.update({
      where: { id },
      data: { activa: true },
      include: materiaGestionInclude,
    }),
  );
};

// Períodos lectivos

const toPeriodoGestionDto = (
  periodo: Prisma.PeriodoLectivoGetPayload<object>,
): PeriodoGestionDto => ({
  id: periodo.id,
  nombre: periodo.nombre,
  fechaInicio: fromDateColumn(periodo.fechaInicio),
  fechaFin: fromDateColumn(periodo.fechaFin),
  activo: periodo.activo,
});

const buscarPeriodo = async (organizationId: string, id: string) => {
  const periodo = await prisma.periodoLectivo.findFirst({ where: { id, organizationId } });
  if (!periodo) throw notFound("Período lectivo");
  return periodo;
};

const assertPeriodoActivo = async (organizationId: string, id: string) => {
  if (!(await buscarPeriodo(organizationId, id)).activo) {
    throw unprocessable("El período está dado de baja");
  }
};

const assertHorariosSinChoque = async (
  organizationId: string,
  comisionId: string,
  periodoLectivoId?: string,
) => {
  const horarios = await prisma.horario.findMany({
    where: { comisionId, activo: true, aulaHabitualId: { not: null } },
  });
  for (const horario of horarios) {
    await assertAulaLibre(organizationId, horario, horario.id, periodoLectivoId);
  }
};

const toPeriodoData = (input: ActualizarPeriodo) => ({
  nombre: input.nombre,
  fechaInicio: input.fechaInicio ? toDateColumn(input.fechaInicio) : undefined,
  fechaFin: input.fechaFin ? toDateColumn(input.fechaFin) : undefined,
});

export const listarPeriodosGestion = async (
  auth: AuthContext,
  bajas: boolean,
): Promise<PeriodoGestionDto[]> => {
  const periodos = await prisma.periodoLectivo.findMany({
    where: { organizationId: await gestor(auth), activo: !bajas },
    orderBy: { fechaInicio: "desc" },
  });
  return periodos.map(toPeriodoGestionDto);
};

export const crearPeriodo = async (
  auth: AuthContext,
  input: CrearPeriodo,
): Promise<PeriodoGestionDto> => {
  const organizationId = await gestor(auth);
  const periodo = await prisma.periodoLectivo.create({
    data: {
      organizationId,
      nombre: input.nombre,
      fechaInicio: toDateColumn(input.fechaInicio),
      fechaFin: toDateColumn(input.fechaFin),
    },
  });
  return toPeriodoGestionDto(periodo);
};

export const actualizarPeriodo = async (
  auth: AuthContext,
  id: string,
  input: ActualizarPeriodo,
): Promise<PeriodoGestionDto> => {
  const organizationId = await gestor(auth);
  const actual = await buscarPeriodo(organizationId, id);
  if (!actual.activo) throw unprocessable("El período está dado de baja: reactivalo para editarlo");
  const inicio = input.fechaInicio ?? fromDateColumn(actual.fechaInicio);
  const fin = input.fechaFin ?? fromDateColumn(actual.fechaFin);
  if (!finPosteriorAlInicio(inicio, fin)) {
    throw unprocessable("La fecha de fin debe ser posterior a la de inicio");
  }
  return toPeriodoGestionDto(
    await prisma.periodoLectivo.update({ where: { id }, data: toPeriodoData(input) }),
  );
};

export const darDeBajaPeriodo = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const periodo = await buscarPeriodo(organizationId, id);
  if (!periodo.activo) throw conflict("El período ya está dado de baja");
  assertSinDependientes(
    await prisma.comision.count({ where: { periodoLectivoId: id, activa: true } }),
    "el período",
    ["comisión activa", "comisiones activas"],
  );
  return toPeriodoGestionDto(
    await prisma.periodoLectivo.update({ where: { id }, data: { activo: false } }),
  );
};

export const reactivarPeriodo = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  if ((await buscarPeriodo(organizationId, id)).activo) throw conflict("El período ya está activo");
  return toPeriodoGestionDto(
    await prisma.periodoLectivo.update({ where: { id }, data: { activo: true } }),
  );
};

// Comisiones

const comisionGestionInclude = {
  materia: true,
  periodoLectivo: { select: { id: true, nombre: true } },
  docentes: { include: { docente: { select: { id: true, name: true } } } },
} satisfies Prisma.ComisionInclude;

type ComisionDeGestion = Prisma.ComisionGetPayload<{ include: typeof comisionGestionInclude }>;

const toComisionGestionDto = (comision: ComisionDeGestion): ComisionGestionDto => ({
  id: comision.id,
  codigo: comision.codigo,
  turno: comision.turno,
  anioLectivo: comision.anioLectivo,
  activa: comision.activa,
  materia: {
    id: comision.materia.id,
    codigo: comision.materia.codigo,
    nombre: comision.materia.nombre,
    anioCarrera: comision.materia.anioCarrera,
    carreraId: comision.materia.carreraId,
  },
  periodoLectivo: comision.periodoLectivo,
  docentes: comision.docentes.map(({ docente }) => ({ id: docente.id, nombre: docente.name })),
});

const buscarComision = async (organizationId: string, id: string) => {
  const comision = await prisma.comision.findFirst({ where: { id, organizationId } });
  if (!comision) throw notFound("Comisión");
  return comision;
};

const assertMateriaActiva = async (organizationId: string, id: string) => {
  if (!(await buscarMateria(organizationId, id)).activa) {
    throw unprocessable("La materia está dada de baja");
  }
};

const assertCodigoComisionLibre = async (materiaId: string, codigo: string, id?: string) => {
  const existente = await prisma.comision.findFirst({
    where: { materiaId, codigo, ...excluyendo(id) },
    select: { id: true },
  });
  if (existente) throw conflict("Ya existe una comisión con ese código en la materia");
};

const assertDocentesAsignables = async (organizationId: string, docenteIds: string[]) => {
  const ids = [...new Set(docenteIds)];
  const validos = await prisma.userProfile.count({
    where: { organizationId, perfil: "DOCENTE", activo: true, userId: { in: ids } },
  });
  if (validos !== ids.length) throw unprocessable("Algún docente no está disponible para asignar");
};

const docentesData = (docenteIds: string[]) => ({
  deleteMany: {},
  create: [...new Set(docenteIds)].map((docenteId) => ({ docenteId })),
});

export const listarComisionesGestion = async (
  auth: AuthContext,
  bajas: boolean,
): Promise<ComisionGestionDto[]> => {
  const comisiones = await prisma.comision.findMany({
    where: { organizationId: await gestor(auth), activa: !bajas },
    orderBy: [{ materia: { nombre: "asc" } }, { codigo: "asc" }],
    include: comisionGestionInclude,
  });
  return comisiones.map(toComisionGestionDto);
};

export const listarDocentesAsignables = async (
  auth: AuthContext,
): Promise<DocenteAsignableDto[]> => {
  const perfiles = await prisma.userProfile.findMany({
    where: { organizationId: await gestor(auth), perfil: "DOCENTE", activo: true },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return perfiles.map(({ user }) => ({ id: user.id, nombre: user.name }));
};

export const crearComision = async (
  auth: AuthContext,
  input: CrearComision,
): Promise<ComisionGestionDto> => {
  const organizationId = await gestor(auth);
  await assertMateriaActiva(organizationId, input.materiaId);
  await assertPeriodoActivo(organizationId, input.periodoLectivoId);
  await assertCodigoComisionLibre(input.materiaId, input.codigo);
  await assertDocentesAsignables(organizationId, input.docenteIds);
  const periodo = await buscarPeriodo(organizationId, input.periodoLectivoId);
  const { docenteIds, ...datos } = input;
  return toComisionGestionDto(
    await prisma.comision.create({
      data: {
        organizationId,
        ...datos,
        anioLectivo: periodo.fechaInicio.getUTCFullYear(),
        docentes: { create: [...new Set(docenteIds)].map((docenteId) => ({ docenteId })) },
      },
      include: comisionGestionInclude,
    }),
  );
};

export const actualizarComision = async (
  auth: AuthContext,
  id: string,
  input: ActualizarComision,
): Promise<ComisionGestionDto> => {
  const organizationId = await gestor(auth);
  const actual = await buscarComision(organizationId, id);
  assertEditable(actual.activa, "La comisión");
  const { docenteIds, ...datos } = input;
  if (datos.materiaId !== undefined) await assertMateriaActiva(organizationId, datos.materiaId);
  if (datos.periodoLectivoId !== undefined) {
    await assertPeriodoActivo(organizationId, datos.periodoLectivoId);
  }
  await assertCodigoComisionLibre(
    datos.materiaId ?? actual.materiaId,
    datos.codigo ?? actual.codigo,
    id,
  );
  if (docenteIds) await assertDocentesAsignables(organizationId, docenteIds);
  if (datos.periodoLectivoId !== undefined) {
    await assertHorariosSinChoque(organizationId, id, datos.periodoLectivoId);
  }
  const periodo = datos.periodoLectivoId
    ? await buscarPeriodo(organizationId, datos.periodoLectivoId)
    : null;
  return toComisionGestionDto(
    await prisma.comision.update({
      where: { id },
      data: {
        ...datos,
        ...(periodo ? { anioLectivo: periodo.fechaInicio.getUTCFullYear() } : {}),
        ...(docenteIds ? { docentes: docentesData(docenteIds) } : {}),
      },
      include: comisionGestionInclude,
    }),
  );
};

export const darDeBajaComision = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  assertCambioDeEstado((await buscarComision(organizationId, id)).activa, false, "La comisión");
  const comision = await prisma.$transaction(async (tx) => {
    const baja = await tx.comision.update({
      where: { id },
      data: { activa: false },
      include: comisionGestionInclude,
    });
    await borrarClasesFuturas(tx, { comisionId: id });
    return baja;
  });
  return toComisionGestionDto(comision);
};

export const reactivarComision = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const actual = await buscarComision(organizationId, id);
  assertCambioDeEstado(actual.activa, true, "La comisión");
  await assertMateriaActiva(organizationId, actual.materiaId);
  await assertPeriodoActivo(organizationId, actual.periodoLectivoId);
  await assertHorariosSinChoque(organizationId, id);
  return toComisionGestionDto(
    await prisma.comision.update({
      where: { id },
      data: { activa: true },
      include: comisionGestionInclude,
    }),
  );
};

// Horarios

const horarioGestionInclude = {
  comision: { select: { id: true, codigo: true, materia: { select: { nombre: true } } } },
  aulaHabitual: { select: { id: true, codigo: true } },
} satisfies Prisma.HorarioInclude;

type HorarioDeGestion = Prisma.HorarioGetPayload<{ include: typeof horarioGestionInclude }>;

const toHorarioGestionDto = (horario: HorarioDeGestion): HorarioGestionDto => ({
  id: horario.id,
  diaSemana: horario.diaSemana,
  horaInicio: horario.horaInicio,
  horaFin: horario.horaFin,
  activo: horario.activo,
  comision: {
    id: horario.comision.id,
    codigo: horario.comision.codigo,
    materia: horario.comision.materia.nombre,
  },
  aulaHabitual: horario.aulaHabitual,
});

const buscarHorario = async (organizationId: string, id: string) => {
  const horario = await prisma.horario.findFirst({ where: { id, organizationId } });
  if (!horario) throw notFound("Horario");
  return horario;
};

const assertComisionActiva = async (organizationId: string, id: string) => {
  if (!(await buscarComision(organizationId, id)).activa) {
    throw unprocessable("La comisión está dada de baja");
  }
};

const assertAulaAsignable = async (organizationId: string, aulaId: string) => {
  const aula = await prisma.aula.findFirst({ where: { id: aulaId, organizationId } });
  if (!aula) throw notFound("Aula");
  if (!aula.activa) throw unprocessable("El aula está dada de baja");
};

type FranjaSemanal = {
  comisionId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  aulaHabitualId: string | null;
};

// RF-16: un aula no tiene dos horarios activos que se superpongan el mismo día en períodos que
// se superponen; el mensaje nombra la comisión que ya la usa.
const assertAulaLibre = async (
  organizationId: string,
  franja: FranjaSemanal,
  excluirId?: string,
  periodoLectivoId?: string,
) => {
  if (!franja.aulaHabitualId) return;
  const periodo =
    periodoLectivoId ?? (await buscarComision(organizationId, franja.comisionId)).periodoLectivoId;
  const { fechaInicio, fechaFin } = await buscarPeriodo(organizationId, periodo);
  const choque = await prisma.horario.findFirst({
    where: {
      organizationId,
      activo: true,
      ...excluyendo(excluirId),
      aulaHabitualId: franja.aulaHabitualId,
      diaSemana: franja.diaSemana,
      horaInicio: { lt: franja.horaFin },
      horaFin: { gt: franja.horaInicio },
      comision: {
        activa: true,
        periodoLectivo: { fechaInicio: { lte: fechaFin }, fechaFin: { gte: fechaInicio } },
      },
    },
    include: {
      aulaHabitual: { select: { codigo: true } },
      comision: { select: { codigo: true, materia: { select: { nombre: true } } } },
    },
  });
  if (!choque) return;
  throw conflict(
    `El aula ${choque.aulaHabitual?.codigo} ya está asignada a la comisión ${choque.comision.codigo} de ${choque.comision.materia.nombre}: ${nombreDiaSemana(choque.diaSemana)} de ${choque.horaInicio} a ${choque.horaFin}`,
  );
};

export const listarHorariosGestion = async (
  auth: AuthContext,
  filtro: { bajas: boolean; comisionId?: string },
): Promise<HorarioGestionDto[]> => {
  const horarios = await prisma.horario.findMany({
    where: {
      organizationId: await gestor(auth),
      activo: !filtro.bajas,
      comisionId: filtro.comisionId,
    },
    orderBy: [
      { comision: { materia: { nombre: "asc" } } },
      { diaSemana: "asc" },
      { horaInicio: "asc" },
    ],
    include: horarioGestionInclude,
  });
  return horarios.map(toHorarioGestionDto);
};

export const crearHorario = async (
  auth: AuthContext,
  input: CrearHorario,
): Promise<HorarioGestionDto> => {
  const organizationId = await gestor(auth);
  await assertComisionActiva(organizationId, input.comisionId);
  const aulaHabitualId = input.aulaHabitualId ?? null;
  if (aulaHabitualId) await assertAulaAsignable(organizationId, aulaHabitualId);
  await assertAulaLibre(organizationId, { ...input, aulaHabitualId });
  return toHorarioGestionDto(
    await prisma.horario.create({
      data: { organizationId, ...input, aulaHabitualId },
      include: horarioGestionInclude,
    }),
  );
};

export const actualizarHorario = async (
  auth: AuthContext,
  id: string,
  input: ActualizarHorario,
): Promise<HorarioGestionDto> => {
  const organizationId = await gestor(auth);
  const actual = await buscarHorario(organizationId, id);
  assertEditable(actual.activo, "El horario");
  const franja: FranjaSemanal = {
    comisionId: actual.comisionId,
    diaSemana: input.diaSemana ?? actual.diaSemana,
    horaInicio: input.horaInicio ?? actual.horaInicio,
    horaFin: input.horaFin ?? actual.horaFin,
    aulaHabitualId:
      input.aulaHabitualId === undefined ? actual.aulaHabitualId : input.aulaHabitualId,
  };
  if (!finPosteriorAlInicio(franja.horaInicio, franja.horaFin)) {
    throw unprocessable("La hora de fin debe ser posterior a la de inicio");
  }
  if (franja.aulaHabitualId) await assertAulaAsignable(organizationId, franja.aulaHabitualId);
  await assertAulaLibre(organizationId, franja, id);
  const horario = await prisma.$transaction(async (tx) => {
    const editado = await tx.horario.update({
      where: { id },
      data: { ...input },
      include: horarioGestionInclude,
    });
    await reubicarClasesFuturas(tx, id, actual.diaSemana, new Date(), auth.userId);
    return editado;
  });
  return toHorarioGestionDto(horario);
};

export const darDeBajaHorario = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const actual = await buscarHorario(organizationId, id);
  if (!actual.activo) throw conflict("El horario ya está dado de baja");
  const horario = await prisma.$transaction(async (tx) => {
    const baja = await tx.horario.update({
      where: { id },
      data: { activo: false },
      include: horarioGestionInclude,
    });
    await borrarClasesFuturas(tx, { horarioId: id });
    return baja;
  });
  return toHorarioGestionDto(horario);
};

export const reactivarHorario = async (auth: AuthContext, id: string) => {
  const organizationId = await gestor(auth);
  const actual = await buscarHorario(organizationId, id);
  if (actual.activo) throw conflict("El horario ya está activo");
  await assertComisionActiva(organizationId, actual.comisionId);
  if (actual.aulaHabitualId) await assertAulaAsignable(organizationId, actual.aulaHabitualId);
  await assertAulaLibre(organizationId, actual, id);
  return toHorarioGestionDto(
    await prisma.horario.update({
      where: { id },
      data: { activo: true },
      include: horarioGestionInclude,
    }),
  );
};

// Días no laborables

const toDiaNoLaborableDto = (
  dia: Prisma.DiaNoLaborableGetPayload<object>,
): DiaNoLaborableGestionDto => ({
  id: dia.id,
  fecha: fromDateColumn(dia.fecha),
  motivo: dia.motivo,
  activo: dia.activo,
});

const buscarDiaNoLaborable = async (organizationId: string, id: string) => {
  const dia = await prisma.diaNoLaborable.findFirst({ where: { id, organizationId } });
  if (!dia) throw notFound("Día no laborable");
  return dia;
};

const assertFechaLibre = async (organizationId: string, fecha: string, id?: string) => {
  const existente = await prisma.diaNoLaborable.findFirst({
    where: { organizationId, fecha: toDateColumn(fecha), ...excluyendo(id) },
    select: { id: true },
  });
  if (existente) throw conflict("Ya hay un día no laborable cargado para esa fecha");
};

export const listarDiasNoLaborablesGestion = async (
  auth: AuthContext,
  bajas: boolean,
): Promise<DiaNoLaborableGestionDto[]> => {
  const dias = await prisma.diaNoLaborable.findMany({
    where: { organizationId: await gestor(auth), activo: !bajas },
    orderBy: { fecha: "asc" },
  });
  return dias.map(toDiaNoLaborableDto);
};

export const crearDiaNoLaborable = async (
  auth: AuthContext,
  input: CrearDiaNoLaborable,
): Promise<DiaNoLaborableGestionDto> => {
  const organizationId = await gestor(auth);
  await assertFechaLibre(organizationId, input.fecha);
  return toDiaNoLaborableDto(
    await prisma.diaNoLaborable.create({
      data: { organizationId, fecha: toDateColumn(input.fecha), motivo: input.motivo },
    }),
  );
};

export const actualizarDiaNoLaborable = async (
  auth: AuthContext,
  id: string,
  input: ActualizarDiaNoLaborable,
): Promise<DiaNoLaborableGestionDto> => {
  const organizationId = await gestor(auth);
  assertEditable((await buscarDiaNoLaborable(organizationId, id)).activo, "El día no laborable");
  if (input.fecha) await assertFechaLibre(organizationId, input.fecha, id);
  return toDiaNoLaborableDto(
    await prisma.diaNoLaborable.update({
      where: { id },
      data: { motivo: input.motivo, fecha: input.fecha ? toDateColumn(input.fecha) : undefined },
    }),
  );
};

const cambiarActivoDiaNoLaborable = async (auth: AuthContext, id: string, activo: boolean) => {
  const dia = await buscarDiaNoLaborable(await gestor(auth), id);
  if (dia.activo === activo) {
    throw conflict(`El día no laborable ya está ${activo ? "activo" : "dado de baja"}`);
  }
  return toDiaNoLaborableDto(
    await prisma.diaNoLaborable.update({ where: { id }, data: { activo } }),
  );
};

export const darDeBajaDiaNoLaborable = (auth: AuthContext, id: string) =>
  cambiarActivoDiaNoLaborable(auth, id, false);

export const reactivarDiaNoLaborable = (auth: AuthContext, id: string) =>
  cambiarActivoDiaNoLaborable(auth, id, true);

export const listarAulasHabituales = async (auth: AuthContext): Promise<AulaDto[]> =>
  prisma.aula.findMany({
    where: { organizationId: await gestor(auth), activa: true },
    orderBy: { codigo: "asc" },
    select: {
      id: true,
      codigo: true,
      edificio: true,
      piso: true,
      capacidad: true,
      equipamiento: true,
    },
  });
