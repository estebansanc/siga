import type { AuthContext } from "@repo/auth";
import { fromDateColumn, prisma, type DbTransaction, type Prisma } from "@repo/db";
import {
  esEstadoClaseFinal,
  estadoClaseLabels,
  estadoClasePorNovedad,
  horaArgentina,
  tipoNovedadLabels,
  editarNovedadSchemaPara,
  type EditarNovedadInput,
  type EstadoClase,
  type ListarNovedadesQuery,
  type PublicarNovedad,
  type TipoNovedad,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import type { NovedadDto } from "../schemas";
import { toIso, toIsoOrNull } from "../serializers";

import { registrarCambioMasivo } from "./auditoria";
import { finalizarClasesVencidas } from "./clases";
import { notificarNovedadPublicada } from "./notificaciones";
import { accesoDenegado, assertPerfil, esBedel } from "./permisos";
import { registrarAsignacionesAula } from "./registro-asignaciones";
import { bloquearAula, estadosSinSolicitud } from "./solicitudes-aula";

const novedadInclude = {
  aulaNueva: { select: { id: true, codigo: true, edificio: true, piso: true } },
  publicadaPor: { select: { id: true, name: true } },
  comision: { include: { materia: { select: { nombre: true } } } },
  clases: { include: { clase: true }, orderBy: { clase: { inicio: "asc" } } },
} satisfies Prisma.NovedadInclude;

type NovedadConDatos = Prisma.NovedadGetPayload<{ include: typeof novedadInclude }>;

type ClaseConFin = { estado: EstadoClase; fin: Date };

// Una clase terminó cuando su franja pasó; las Ausentes y Suspendidas no pasan a Finalizada
// por horario, por eso se mira también el fin.
const claseTerminada = (clase: ClaseConFin, ahora: Date) =>
  clase.estado === "FINALIZADA" || clase.fin < ahora;

const toNovedadDto = (novedad: NovedadConDatos, ahora = new Date()): NovedadDto => ({
  id: novedad.id,
  tipo: novedad.tipo,
  estado: novedad.estado,
  minutosDemora: novedad.minutosDemora,
  enlaceVirtual: novedad.enlaceVirtual,
  aulaNueva: novedad.aulaNueva,
  mensaje: novedad.mensaje,
  publicadaPor: { id: novedad.publicadaPor.id, nombre: novedad.publicadaPor.name },
  publicadaPorBedelia: novedad.publicadaPorBedelia,
  createdAt: toIso(novedad.createdAt),
  finalizadaEn: toIsoOrNull(novedad.finalizadaEn),
  editable:
    novedad.estado === "ACTIVA" && novedad.clases.some(({ clase }) => !claseTerminada(clase, ahora)),
  comision: {
    id: novedad.comision.id,
    codigo: novedad.comision.codigo,
    materia: novedad.comision.materia.nombre,
  },
  clases: novedad.clases.map(({ clase }) => ({
    id: clase.id,
    fecha: fromDateColumn(clase.fecha),
    horaInicio: horaArgentina(clase.inicio),
    horaFin: horaArgentina(clase.fin),
    estado: clase.estado,
  })),
});

// Desde qué estados admite cada tipo (tabla de estados de `novedades.md`): Demora y Virtual
// solo sobre una clase Programada; Ausencia también sobre una Demorada; Suspensión y Cambio
// de aula sobre cualquiera que no esté en estado final.
const estadosAdmitidos: Record<TipoNovedad, readonly EstadoClase[]> = {
  DEMORA: ["PROGRAMADA"],
  VIRTUAL: ["PROGRAMADA"],
  AUSENCIA: ["PROGRAMADA", "DEMORADA"],
  SUSPENSION: ["PROGRAMADA", "DEMORADA", "VIRTUAL", "DOCENTE_PRESENTE"],
  CAMBIO_AULA: ["PROGRAMADA", "DEMORADA", "DOCENTE_PRESENTE"],
};

const describirClase = (clase: { fecha: Date; inicio: Date }) =>
  `la clase del ${fromDateColumn(clase.fecha).split("-").reverse().join("/")} a las ${horaArgentina(clase.inicio)}`;

const assertDocenteDeLaComision = async (
  auth: AuthContext,
  comision: { id: string; docentes: { docenteId: string }[] },
) => {
  if (esBedel(auth)) return;
  if (comision.docentes.some((docente) => docente.docenteId === auth.userId)) return;
  throw await accesoDenegado(auth, { comisionId: comision.id, accion: "novedad" });
};

const buscarAulaDisponible = async (organizationId: string, aulaId: string) => {
  const aula = await prisma.aula.findFirst({
    where: { id: aulaId, organizationId, activa: true, estado: "DISPONIBLE" },
    select: { id: true },
  });
  if (!aula) throw unprocessable("El aula elegida no está disponible");
  return aula;
};

// Regla de no superposición (RF-16), verificada dentro de la transacción.
const assertAulaLibre = async (
  tx: DbTransaction,
  aulaId: string,
  clases: { id: string; inicio: Date; fin: Date }[],
) => {
  await bloquearAula(tx, aulaId);
  for (const clase of clases) {
    const ocupada = await tx.claseProgramada.findFirst({
      where: {
        aulaId,
        id: { not: clase.id },
        inicio: { lt: clase.fin },
        fin: { gt: clase.inicio },
        estado: { notIn: [...estadosSinSolicitud] },
      },
      select: { id: true },
    });
    if (ocupada) throw conflict("El aula ya está asignada en esa franja");
  }
};

// Novedad de bedelía que acompaña, en la misma transacción, un cambio de aula hecho al
// resolver una solicitud (RF-16): los estudiantes ven el aula nueva sin acción del docente.
export const crearNovedadCambioAula = async (
  tx: DbTransaction,
  datos: {
    organizationId: string;
    publicadaPorId: string;
    comisionId: string;
    claseId: string;
    aulaAnteriorId: string;
    aulaNuevaId: string;
  },
): Promise<NovedadDto> => {
  const novedad = await tx.novedad.create({
    data: {
      organizationId: datos.organizationId,
      comisionId: datos.comisionId,
      tipo: "CAMBIO_AULA",
      aulaNuevaId: datos.aulaNuevaId,
      publicadaPorId: datos.publicadaPorId,
      publicadaPorBedelia: true,
      clases: { create: { claseId: datos.claseId, aulaAnteriorId: datos.aulaAnteriorId } },
    },
    include: novedadInclude,
  });
  return toNovedadDto(novedad);
};

// RF-05: una novedad sobre una o varias clases de la misma comisión. Registra quién la
// publica, cambia el estado de cada clase según el tipo y, si es Cambio de aula, reserva el
// aula nueva; todo o nada (FIAB-6).
export const publicarNovedad = async (
  auth: AuthContext,
  input: PublicarNovedad,
): Promise<NovedadDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  await finalizarClasesVencidas(auth.organizationId);
  const claseIds = [...new Set(input.claseIds)];
  const clases = await prisma.claseProgramada.findMany({
    where: { id: { in: claseIds }, organizationId: auth.organizationId },
    include: { comision: { include: { docentes: true } } },
    orderBy: { inicio: "asc" },
  });
  if (clases.length !== claseIds.length) throw notFound("Clase");
  const comision = clases[0]!.comision;
  if (clases.some((clase) => clase.comisionId !== comision.id)) {
    throw unprocessable("Elegí clases de una sola comisión");
  }
  await assertDocenteDeLaComision(auth, comision);
  for (const clase of clases) {
    if (esEstadoClaseFinal(clase.estado)) {
      throw unprocessable(
        `No se puede publicar sobre ${describirClase(clase)}: ya está ${estadoClaseLabels[clase.estado].toLowerCase()}`,
      );
    }
    if (!estadosAdmitidos[input.tipo].includes(clase.estado)) {
      throw unprocessable(
        `No se puede publicar ${tipoNovedadLabels[input.tipo]} sobre ${describirClase(clase)}: está ${estadoClaseLabels[clase.estado].toLowerCase()}`,
      );
    }
  }
  const aulaNueva =
    input.tipo === "CAMBIO_AULA" && input.aulaNuevaId
      ? await buscarAulaDisponible(auth.organizationId, input.aulaNuevaId)
      : null;
  const estadoNuevo = estadoClasePorNovedad[input.tipo];

  const publicada = await prisma.$transaction(async (tx) => {
    if (aulaNueva) await assertAulaLibre(tx, aulaNueva.id, clases);
    await tx.claseProgramada.updateMany({
      where: { id: { in: claseIds } },
      data: {
        ...(estadoNuevo ? { estado: estadoNuevo } : {}),
        ...(input.tipo === "VIRTUAL" ? { modalidad: "VIRTUAL" } : {}),
        ...(aulaNueva ? { aulaId: aulaNueva.id } : {}),
      },
    });
    if (aulaNueva) {
      await registrarAsignacionesAula(
        tx,
        clases
          .filter(({ aulaId }) => aulaId !== aulaNueva.id)
          .map((clase) => ({
            organizationId: auth.organizationId,
            claseId: clase.id,
            aulaId: aulaNueva.id,
            origen: "CAMBIO_AULA" as const,
            usuarioId: auth.userId,
          })),
      );
    }
    await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "novedad_publicada", {
      claseIds,
      tipo: input.tipo,
      estado: estadoNuevo,
      aulaId: aulaNueva?.id ?? null,
    });
    const novedad = await tx.novedad.create({
      data: {
        organizationId: auth.organizationId,
        comisionId: comision.id,
        tipo: input.tipo,
        minutosDemora: input.tipo === "DEMORA" ? input.minutosDemora : null,
        enlaceVirtual: input.tipo === "VIRTUAL" ? input.enlaceVirtual : null,
        aulaNuevaId: aulaNueva?.id ?? null,
        mensaje: input.mensaje ?? null,
        publicadaPorId: auth.userId,
        publicadaPorBedelia: esBedel(auth),
        clases: {
          create: clases.map((clase) => ({
            claseId: clase.id,
            aulaAnteriorId: aulaNueva ? clase.aulaId : null,
          })),
        },
      },
      include: novedadInclude,
    });
    return toNovedadDto(novedad);
  });
  await notificarNovedadPublicada(auth.organizationId, publicada);
  return publicada;
};

// Finalizar una Demora o un Cambio de modalidad devuelve la clase a Programada (no hay
// asistencia registrada en esta versión); un Cambio de aula restituye el aula anterior si
// sigue libre. Ausencia y Suspensión dejaron la clase en estado final y no se finalizan.
export const finalizarNovedad = async (
  auth: AuthContext,
  novedadId: string,
): Promise<NovedadDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  const novedad = await prisma.novedad.findFirst({
    where: { id: novedadId, organizationId: auth.organizationId },
    include: { ...novedadInclude, comision: { include: { docentes: true, materia: true } } },
  });
  if (!novedad) throw notFound("Novedad");
  await assertDocenteDeLaComision(auth, novedad.comision);
  if (novedad.estado === "FINALIZADA") throw unprocessable("La novedad ya está finalizada");
  if (novedad.tipo === "AUSENCIA" || novedad.tipo === "SUSPENSION") {
    throw unprocessable(
      "Una novedad de Ausencia o Suspensión no se finaliza: la clase quedó en estado final",
    );
  }

  return prisma.$transaction(async (tx) => {
    const restituidas: string[] = [];
    const asignaciones: Parameters<typeof registrarAsignacionesAula>[1] = [];
    if (novedad.tipo === "CAMBIO_AULA") {
      for (const { clase, aulaAnteriorId } of novedad.clases) {
        if (!aulaAnteriorId || esEstadoClaseFinal(clase.estado)) continue;
        const libre = await assertAulaLibre(tx, aulaAnteriorId, [clase]).then(
          () => true,
          () => false,
        );
        if (!libre) continue;
        await tx.claseProgramada.update({
          where: { id: clase.id },
          data: { aulaId: aulaAnteriorId },
        });
        asignaciones.push({
          organizationId: auth.organizationId,
          claseId: clase.id,
          aulaId: aulaAnteriorId,
          origen: "CAMBIO_AULA",
          usuarioId: auth.userId,
        });
        restituidas.push(clase.id);
      }
      await registrarAsignacionesAula(tx, asignaciones);
    } else {
      const estadoActivo = estadoClasePorNovedad[novedad.tipo];
      const claseIds = novedad.clases
        .filter(({ clase }) => clase.estado === estadoActivo)
        .map(({ clase }) => clase.id);
      await tx.claseProgramada.updateMany({
        where: { id: { in: claseIds } },
        data: { estado: "PROGRAMADA", modalidad: "PRESENCIAL" },
      });
      restituidas.push(...claseIds);
    }
    await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "novedad_finalizada", {
      novedadId: novedad.id,
      claseIds: restituidas,
    });
    const finalizada = await tx.novedad.update({
      where: { id: novedad.id },
      data: { estado: "FINALIZADA", finalizadaEn: new Date(), finalizadaPorId: auth.userId },
      include: novedadInclude,
    });
    return toNovedadDto(finalizada);
  });
};

// RF-05: edita el dato propio del tipo y el mensaje de una novedad activa; tipo y clases no
// cambian. Las clases que ya terminaron quedan como están. Cada edición guarda los datos
// nuevos y los previos para conservar el historial (DAT-3) y no envía correo.
export const editarNovedad = async (
  auth: AuthContext,
  novedadId: string,
  input: EditarNovedadInput,
): Promise<NovedadDto> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL");
  await finalizarClasesVencidas(auth.organizationId);
  const novedad = await prisma.novedad.findFirst({
    where: { id: novedadId, organizationId: auth.organizationId },
    include: { ...novedadInclude, comision: { include: { docentes: true, materia: true } } },
  });
  if (!novedad) throw notFound("Novedad");
  await assertDocenteDeLaComision(auth, novedad.comision);
  if (novedad.estado === "FINALIZADA") throw unprocessable("La novedad ya está finalizada");
  const ahora = new Date();
  const clasesVigentes = novedad.clases
    .map(({ clase }) => clase)
    .filter((clase) => !claseTerminada(clase, ahora));
  if (clasesVigentes.length === 0) {
    throw unprocessable("No se puede editar: todas las clases de la novedad ya terminaron");
  }
  const datos = editarNovedadSchemaPara(novedad.tipo).safeParse(input);
  if (!datos.success) throw unprocessable(datos.error.issues[0]!.message);
  const nuevos = {
    minutosDemora: datos.data.minutosDemora ?? null,
    enlaceVirtual: datos.data.enlaceVirtual ?? null,
    aulaNuevaId: datos.data.aulaNuevaId ?? null,
    mensaje: datos.data.mensaje ?? null,
  };
  const sinCambios =
    nuevos.minutosDemora === novedad.minutosDemora &&
    nuevos.enlaceVirtual === novedad.enlaceVirtual &&
    nuevos.aulaNuevaId === novedad.aulaNuevaId &&
    nuevos.mensaje === novedad.mensaje;
  if (sinCambios) return toNovedadDto(novedad, ahora);
  if (nuevos.aulaNuevaId) await buscarAulaDisponible(auth.organizationId, nuevos.aulaNuevaId);

  return prisma.$transaction(async (tx) => {
    if (nuevos.aulaNuevaId && nuevos.aulaNuevaId !== novedad.aulaNuevaId) {
      await mudarClasesAAula(tx, auth, nuevos.aulaNuevaId, clasesVigentes);
    }
    await tx.novedadEdicion.create({
      data: {
        novedadId: novedad.id,
        editadaPorId: auth.userId,
        editadaPorBedelia: esBedel(auth),
        ...nuevos,
        minutosDemoraPrevios: novedad.minutosDemora,
        enlaceVirtualPrevio: novedad.enlaceVirtual,
        aulaPreviaId: novedad.aulaNuevaId,
        mensajePrevio: novedad.mensaje,
      },
    });
    const editada = await tx.novedad.update({
      where: { id: novedad.id },
      data: nuevos,
      include: novedadInclude,
    });
    return toNovedadDto(editada, ahora);
  });
};

const mudarClasesAAula = async (
  tx: DbTransaction,
  auth: AuthContext,
  aulaId: string,
  clases: { id: string; inicio: Date; fin: Date; aulaId: string | null }[],
) => {
  await assertAulaLibre(tx, aulaId, clases);
  const movidas = clases.filter((clase) => clase.aulaId !== aulaId);
  const claseIds = movidas.map(({ id }) => id);
  await tx.claseProgramada.updateMany({ where: { id: { in: claseIds } }, data: { aulaId } });
  await registrarAsignacionesAula(
    tx,
    movidas.map((clase) => ({
      organizationId: auth.organizationId,
      claseId: clase.id,
      aulaId,
      origen: "CAMBIO_AULA" as const,
      usuarioId: auth.userId,
    })),
  );
  await registrarCambioMasivo(tx, auth.organizationId, "ClaseProgramada", "novedad_editada", {
    claseIds,
    aulaId,
  });
};

// El docente ve las de sus comisiones; bedel y autoridad, todas.
export const listarNovedades = async (
  auth: AuthContext,
  query: ListarNovedadesQuery,
): Promise<NovedadDto[]> => {
  await assertPerfil(auth, "DOCENTE", "BEDEL", "AUTORIDAD");
  const novedades = await prisma.novedad.findMany({
    where: {
      organizationId: auth.organizationId,
      estado: query.estado,
      ...(auth.perfil === "DOCENTE"
        ? { comision: { docentes: { some: { docenteId: auth.userId } } } }
        : {}),
    },
    include: novedadInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return novedades.map((novedad) => toNovedadDto(novedad));
};
