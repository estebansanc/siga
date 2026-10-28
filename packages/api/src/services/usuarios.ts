import { auth, type AuthContext } from "@repo/auth";
import { prisma, type Prisma } from "@repo/db";
import {
  estadoDeUsuario,
  type ActualizarUsuario,
  type CrearUsuario,
  type DominiosPermitidos,
  type Perfil,
  type UsuariosQuery,
} from "@repo/domain";

import "../auth-emails";
import { fieldConflict, notFound, unavailable, unprocessable } from "../errors";
import type { DominiosPermitidosDto, UsuarioDto } from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { assertPerfil } from "./permisos";

const gestor = async (auth: AuthContext) => {
  await assertPerfil(auth, "BEDEL", "AUTORIDAD");
  return auth.organizationId;
};

const usuarioSelect = {
  userId: true,
  perfil: true,
  dni: true,
  legajo: true,
  activo: true,
  user: {
    select: {
      name: true,
      email: true,
      emailVerified: true,
      comisionesDictadas: {
        select: {
          comision: { select: { id: true, codigo: true, materia: { select: { nombre: true } } } },
        },
      },
    },
  },
} satisfies Prisma.UserProfileSelect;

type UsuarioConDatos = Prisma.UserProfileGetPayload<{ select: typeof usuarioSelect }>;

const toUsuarioDto = (perfil: UsuarioConDatos, solicitanteId: string): UsuarioDto => ({
  id: perfil.userId,
  nombre: perfil.user.name,
  correo: perfil.user.email,
  dni: perfil.dni,
  legajo: perfil.legajo,
  perfil: perfil.perfil,
  estado: estadoDeUsuario({ activo: perfil.activo, correoVerificado: perfil.user.emailVerified }),
  comisiones: perfil.user.comisionesDictadas
    .map(({ comision }) => ({
      id: comision.id,
      codigo: comision.codigo,
      materia: comision.materia.nombre,
    }))
    .sort((a, b) => a.materia.localeCompare(b.materia) || a.codigo.localeCompare(b.codigo)),
  esPropio: perfil.userId === solicitanteId,
});

const buscarUsuario = async (organizationId: string, id: string) => {
  const perfil = await prisma.userProfile.findFirst({
    where: { userId: id, organizationId },
    select: usuarioSelect,
  });
  if (!perfil) throw notFound("Usuario");
  return perfil;
};

export const listarUsuarios = async (
  auth: AuthContext,
  query: UsuariosQuery,
): Promise<UsuarioDto[]> => {
  const organizationId = await gestor(auth);
  const texto = query.q;
  const perfiles = await prisma.userProfile.findMany({
    where: {
      organizationId,
      perfil: query.perfil,
      ...(texto
        ? {
            OR: [
              { user: { name: { contains: texto, mode: "insensitive" } } },
              { user: { email: { contains: texto, mode: "insensitive" } } },
              { dni: { contains: texto } },
            ],
          }
        : {}),
    },
    select: usuarioSelect,
    orderBy: { user: { name: "asc" } },
  });
  return perfiles.map((perfil) => toUsuarioDto(perfil, auth.userId));
};

const assertDatosLibres = async (
  organizationId: string,
  datos: { dni?: string; correo?: string },
  excluirId?: string,
) => {
  if (datos.correo) {
    const existente = await prisma.user.findFirst({
      where: { email: { equals: datos.correo, mode: "insensitive" }, id: { not: excluirId } },
      select: { id: true, profile: { select: { userId: true } } },
    });
    if (existente) {
      throw fieldConflict(
        "correo",
        existente.profile
          ? "Ya existe una cuenta con ese correo"
          : "Esa persona ya se registró y todavía no verificó su correo",
      );
    }
  }
  if (datos.dni) {
    const existente = await prisma.userProfile.findFirst({
      where: { organizationId, dni: datos.dni, userId: { not: excluirId } },
      select: { userId: true },
    });
    if (existente) throw fieldConflict("dni", "Ya existe un usuario con ese DNI");
  }
};

const comisionesParaPerfil = (perfil: Perfil, comisionIds: string[] | undefined) =>
  perfil === "DOCENTE" ? [...new Set(comisionIds ?? [])] : [];

const assertComisionesActivas = async (organizationId: string, comisionIds: string[]) => {
  if (comisionIds.length === 0) return;
  const activas = await prisma.comision.count({
    where: { organizationId, activa: true, id: { in: comisionIds } },
  });
  if (activas !== comisionIds.length) {
    throw unprocessable("Alguna comisión no está disponible para asignar");
  }
};

// Vence en 24 horas; pedir otro enlace anula el anterior.
const enviarEnlaceDeActivacion = async (userId: string, correo: string) => {
  await prisma.verification.deleteMany({
    where: { identifier: { startsWith: "reset-password:" }, value: userId },
  });
  const encoladosAntes = await prisma.emailOutbox.count({ where: { to: correo } });
  await auth.api.requestPasswordReset({ body: { email: correo, redirectTo: "/activar-cuenta" } });
  // Better Auth atrapa el error del envío y solo lo registra: la única señal es la fila encolada.
  const encoladosDespues = await prisma.emailOutbox.count({ where: { to: correo } });
  if (encoladosDespues === encoladosAntes) {
    throw unavailable("No pudimos enviar el enlace de activación: reintentá en un rato");
  }
};

export const crearUsuario = async (auth: AuthContext, input: CrearUsuario): Promise<UsuarioDto> => {
  const organizationId = await gestor(auth);
  await assertDatosLibres(organizationId, { dni: input.dni, correo: input.correo });
  const comisionIds = comisionesParaPerfil(input.perfil, input.comisionIds);
  await assertComisionesActivas(organizationId, comisionIds);

  const userId = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      name: input.nombre,
      email: input.correo,
      emailVerified: false,
      members: {
        create: { id: crypto.randomUUID(), organizationId, role: "member", createdAt: new Date() },
      },
      profile: {
        create: {
          organizationId,
          perfil: input.perfil,
          dni: input.dni,
          legajo: input.legajo ?? null,
        },
      },
      comisionesDictadas: { create: comisionIds.map((comisionId) => ({ comisionId })) },
    },
  });
  // Sin enlace la cuenta no sirve y reintentar daría 409: si no se encola, el alta no persiste.
  await enviarEnlaceDeActivacion(userId, input.correo).catch(async (error: unknown) => {
    await prisma.verification.deleteMany({ where: { value: userId } });
    await prisma.user.delete({ where: { id: userId } });
    throw error;
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: auth.userId,
      entity: "UserProfile",
      entityId: userId,
      action: "create",
      after: { perfil: input.perfil, dni: input.dni, legajo: input.legajo ?? null, comisionIds },
    },
  });
  return toUsuarioDto(await buscarUsuario(organizationId, userId), auth.userId);
};

export const actualizarUsuario = async (
  auth: AuthContext,
  id: string,
  input: ActualizarUsuario,
): Promise<UsuarioDto> => {
  const organizationId = await gestor(auth);
  const actual = await buscarUsuario(organizationId, id);
  const perfil = input.perfil ?? actual.perfil;
  if (id === auth.userId && perfil !== actual.perfil) {
    throw unprocessable("No podés cambiar tu propio perfil");
  }
  await assertDatosLibres(organizationId, { dni: input.dni }, id);
  const comisionIds =
    input.comisionIds !== undefined || perfil !== actual.perfil
      ? comisionesParaPerfil(
          perfil,
          input.comisionIds ?? actual.user.comisionesDictadas.map((c) => c.comision.id),
        )
      : null;
  if (comisionIds) await assertComisionesActivas(organizationId, comisionIds);

  if (input.nombre !== undefined) {
    await prisma.user.update({ where: { id }, data: { name: input.nombre } });
  }
  await prisma.userProfile.update({
    where: { userId: id },
    data: {
      perfil: input.perfil,
      dni: input.dni,
      legajo: input.legajo === undefined ? undefined : input.legajo,
    },
  });
  if (comisionIds) {
    await prisma.$transaction(async (tx) => {
      await tx.comisionDocente.deleteMany({ where: { docenteId: id } });
      await tx.comisionDocente.createMany({
        data: comisionIds.map((comisionId) => ({ comisionId, docenteId: id })),
      });
      await registrarCambioMasivo(tx, organizationId, "UserProfile", "comisiones_actualizadas", {
        usuarioId: id,
        comisionIds,
      });
    });
  }
  return toUsuarioDto(await buscarUsuario(organizationId, id), auth.userId);
};

const cambiarActivo = async (auth: AuthContext, id: string, activo: boolean) => {
  const organizationId = await gestor(auth);
  const actual = await buscarUsuario(organizationId, id);
  if (!activo && id === auth.userId) throw unprocessable("No podés desactivar tu propia cuenta");
  if (actual.activo === activo) {
    throw fieldConflict(
      "estado",
      activo ? "La cuenta ya está activa" : "La cuenta ya está desactivada",
    );
  }
  await prisma.userProfile.update({ where: { userId: id }, data: { activo } });
  return toUsuarioDto(await buscarUsuario(organizationId, id), auth.userId);
};

export const desactivarUsuario = (auth: AuthContext, id: string) => cambiarActivo(auth, id, false);

export const reactivarUsuario = (auth: AuthContext, id: string) => cambiarActivo(auth, id, true);

export const reenviarActivacion = async (auth: AuthContext, id: string): Promise<UsuarioDto> => {
  const organizationId = await gestor(auth);
  const usuario = await buscarUsuario(organizationId, id);
  if (usuario.user.emailVerified) throw fieldConflict("estado", "La cuenta ya está activada");
  await enviarEnlaceDeActivacion(id, usuario.user.email);
  return toUsuarioDto(usuario, auth.userId);
};

// ---------- Dominios permitidos (CFG-1) ----------

export const obtenerDominiosPermitidos = async (
  auth: AuthContext,
): Promise<DominiosPermitidosDto> => {
  const organizationId = await gestor(auth);
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: { dominiosPermitidos: true },
  });
  return { dominios: settings?.dominiosPermitidos ?? [] };
};

export const actualizarDominiosPermitidos = async (
  auth: AuthContext,
  input: DominiosPermitidos,
): Promise<DominiosPermitidosDto> => {
  const organizationId = await gestor(auth);
  await prisma.organizationSettings.upsert({
    where: { organizationId },
    create: { organizationId, dominiosPermitidos: input.dominios },
    update: { dominiosPermitidos: input.dominios },
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: auth.userId,
      entity: "OrganizationSettings",
      entityId: organizationId,
      action: "dominios_permitidos",
      after: { dominios: input.dominios },
    },
  });
  return { dominios: input.dominios };
};
