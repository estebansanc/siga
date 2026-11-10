import type { AuthContext } from "@repo/auth";
import { prisma, type Aviso, type Prisma } from "@repo/db";
import {
  avisoAlcanza,
  type CrearAviso,
  type DestinatarioPosible,
  type ListarAvisosQuery,
  type SegmentoAviso,
} from "@repo/domain";

import { runDeferred } from "../deferred";
import { apiEnv } from "../env";
import { notFound, unprocessable } from "../errors";
import type { AvisoDto, NotificacionAvisoDto } from "../schemas";
import { toIso, toIsoOrNull } from "../serializers";

import { avisoEmail } from "./emails/templates";
import { crearTokenBajaAvisos, enviarCorreos, registrarEnvios, urlDeBaja } from "./notificaciones";
import { assertPerfil } from "./permisos";

// Historial y Publicados crecen sin techo: se muestran los más recientes.
const maxAvisosListados = 100;

const avisoInclude = {
  publicadoPor: { select: { id: true, name: true } },
  finalizadoPor: { select: { id: true, name: true } },
} satisfies Prisma.AvisoInclude;

type AvisoConAutor = Prisma.AvisoGetPayload<{ include: typeof avisoInclude }>;

const segmentoDe = (aviso: Aviso): SegmentoAviso => ({
  todos: aviso.todos,
  perfiles: aviso.perfiles,
  carreraIds: aviso.carreraIds,
  anios: aviso.anios,
  comisionIds: aviso.comisionIds,
});

const toDto = (aviso: AvisoConAutor): AvisoDto => ({
  id: aviso.id,
  titulo: aviso.titulo,
  cuerpo: aviso.cuerpo,
  prioridad: aviso.prioridad,
  destinatarios: segmentoDe(aviso),
  desde: toIso(aviso.desde),
  hasta: toIso(aviso.hasta),
  enviarPorCorreo: aviso.enviarPorCorreo,
  publicadoPor: { id: aviso.publicadoPor.id, nombre: aviso.publicadoPor.name },
  finalizadoEn: toIsoOrNull(aviso.finalizadoEn),
  finalizadoPor: aviso.finalizadoPor
    ? { id: aviso.finalizadoPor.id, nombre: aviso.finalizadoPor.name }
    : null,
  createdAt: toIso(aviso.createdAt),
});

const comisionesDeUsuarioSelect = {
  comision: { select: { id: true, materia: { select: { carreraId: true, anioCarrera: true } } } },
} as const;

type ComisionConMateria = {
  comision: { id: string; materia: { carreraId: string; anioCarrera: number } };
};

const toComisionDeDestinatario = ({ comision }: ComisionConMateria) => ({
  id: comision.id,
  carreraId: comision.materia.carreraId,
  anio: comision.materia.anioCarrera,
});

// Estudiantes: las comisiones que siguen; docentes: las que dictan (no hay inscripción).
const comisionesDe = (user: {
  comisionesSeguidas: ComisionConMateria[];
  comisionesDictadas: ComisionConMateria[];
}) => [...user.comisionesSeguidas, ...user.comisionesDictadas].map(toComisionDeDestinatario);

const comisionesInclude = {
  comisionesSeguidas: { select: comisionesDeUsuarioSelect },
  comisionesDictadas: { select: comisionesDeUsuarioSelect },
} satisfies Prisma.UserInclude;

const destinatarioPosibleDe = async (auth: AuthContext): Promise<DestinatarioPosible> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    include: comisionesInclude,
  });
  return { perfil: auth.perfil, comisiones: comisionesDe(user) };
};

const vistaWhere = (vista: ListarAvisosQuery["vista"], now: Date): Prisma.AvisoWhereInput => {
  if (vista === "VIGENTES") return { desde: { lte: now }, hasta: { gt: now } };
  if (vista === "HISTORIAL") return { hasta: { lte: now } };
  return {};
};

const vistaOrderBy = (
  vista: ListarAvisosQuery["vista"],
): Prisma.AvisoOrderByWithRelationInput[] => {
  if (vista === "HISTORIAL") return [{ hasta: "desc" }];
  if (vista === "PUBLICADOS") return [{ createdAt: "desc" }];
  return [{ desde: "desc" }];
};

const urgentesPrimero = (avisos: AvisoDto[]) => [
  ...avisos.filter((aviso) => aviso.prioridad === "URGENTE"),
  ...avisos.filter((aviso) => aviso.prioridad !== "URGENTE"),
];

// Vigentes e historial son lo que le corresponde al usuario según el segmento; "Publicados"
// es la vista de quien publica y lista todos los avisos de la institución, aunque todavía no
// hayan empezado.
export const listarAvisos = async (
  auth: AuthContext,
  query: ListarAvisosQuery,
  now = new Date(),
): Promise<AvisoDto[]> => {
  if (query.vista === "PUBLICADOS") await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const avisos = await prisma.aviso.findMany({
    where: { organizationId: auth.organizationId, ...vistaWhere(query.vista, now) },
    include: avisoInclude,
    orderBy: vistaOrderBy(query.vista),
    take: maxAvisosListados,
  });
  if (query.vista === "PUBLICADOS") return avisos.map(toDto);
  const destinatario = await destinatarioPosibleDe(auth);
  const dtos = avisos.filter((aviso) => avisoAlcanza(segmentoDe(aviso), destinatario)).map(toDto);
  return query.vista === "VIGENTES" ? urgentesPrimero(dtos) : dtos;
};

export const publicarAviso = async (auth: AuthContext, input: CrearAviso): Promise<AvisoDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const aviso = await prisma.aviso.create({
    data: {
      organizationId: auth.organizationId,
      titulo: input.titulo,
      cuerpo: input.cuerpo,
      prioridad: input.prioridad,
      ...input.destinatarios,
      desde: input.desde ? new Date(input.desde) : new Date(),
      hasta: new Date(input.hasta),
      enviarPorCorreo: input.enviarPorCorreo,
      publicadoPorId: auth.userId,
    },
    include: avisoInclude,
  });
  if (aviso.enviarPorCorreo) await notificarAvisoPublicado(auth.organizationId, aviso);
  return toDto(aviso);
};

// Finalizar no borra: la vigencia termina ahora y el aviso pasa al historial con quién lo
// finalizó. Uno programado a futuro termina sin llegar a mostrarse.
export const finalizarAviso = async (
  auth: AuthContext,
  avisoId: string,
  now = new Date(),
): Promise<AvisoDto> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const aviso = await prisma.aviso.findFirst({
    where: { id: avisoId, organizationId: auth.organizationId },
    select: { desde: true, hasta: true },
  });
  if (!aviso) throw notFound("Aviso");
  if (aviso.hasta <= now) throw unprocessable("El aviso ya terminó");
  const finalizado = await prisma.aviso.update({
    where: { id: avisoId },
    data: {
      desde: aviso.desde < now ? aviso.desde : now,
      hasta: now,
      finalizadoEn: now,
      finalizadoPorId: auth.userId,
    },
    include: avisoInclude,
  });
  return toDto(finalizado);
};

export const listarNotificacionesDeAviso = async (
  auth: AuthContext,
  avisoId: string,
): Promise<NotificacionAvisoDto[]> => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  const aviso = await prisma.aviso.findFirst({
    where: { id: avisoId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!aviso) throw notFound("Aviso");
  const notificaciones = await prisma.notificacion.findMany({
    where: { avisoId, organizationId: auth.organizationId },
    include: {
      destinatario: { select: { id: true, name: true, email: true } },
      email: { select: { status: true } },
    },
    orderBy: { destinatario: { name: "asc" } },
  });
  return notificaciones.map((notificacion) => ({
    id: notificacion.id,
    destinatario: {
      id: notificacion.destinatario.id,
      nombre: notificacion.destinatario.name,
      email: notificacion.destinatario.email,
    },
    estado: notificacion.email.status,
  }));
};

// Los estudiantes reciben el correo solo si activaron la opción; los demás perfiles, siempre.
const buscarDestinatarios = async (organizationId: string, aviso: Aviso) => {
  const usuarios = await prisma.user.findMany({
    where: {
      profile: {
        organizationId,
        activo: true,
        OR: [{ perfil: { not: "ESTUDIANTE" } }, { notificarAvisosPorCorreo: true }],
      },
    },
    include: { ...comisionesInclude, profile: { select: { perfil: true } } },
  });
  const segmento = segmentoDe(aviso);
  return usuarios.flatMap((usuario) => {
    if (!usuario.profile) return [];
    const destinatario = { perfil: usuario.profile.perfil, comisiones: comisionesDe(usuario) };
    return avisoAlcanza(segmento, destinatario)
      ? [{ ...usuario, perfil: destinatario.perfil }]
      : [];
  });
};

const enviarAviso = async (organizationId: string, aviso: Aviso) => {
  const destinatarios = await buscarDestinatarios(organizationId, aviso);
  const envios = destinatarios.map((destinatario) => ({
    destinatarioId: destinatario.id,
    to: destinatario.email,
    ...avisoEmail({
      titulo: aviso.titulo,
      cuerpo: aviso.cuerpo,
      prioridad: aviso.prioridad,
      desde: aviso.desde,
      hasta: aviso.hasta,
      avisosUrl: `${apiEnv.appUrl}/avisos`,
      bajaUrl:
        destinatario.perfil === "ESTUDIANTE"
          ? urlDeBaja(crearTokenBajaAvisos(destinatario.id))
          : null,
    }),
  }));
  const correos = await registrarEnvios(organizationId, envios, {
    tipo: "AVISO",
    avisoId: aviso.id,
  });
  await enviarCorreos(correos);
};

// Un fallo acá no deshace la publicación: el envío fallido queda en el outbox y el cron lo
// reintenta. Con "desde" futuro el correo sale igual al publicar (anticipa, p. ej. un
// mantenimiento programado).
const notificarAvisoPublicado = (organizationId: string, aviso: Aviso) =>
  runDeferred("notificar-aviso", async () => {
    try {
      await enviarAviso(organizationId, aviso);
    } catch (error) {
      console.error(error);
    }
  });
