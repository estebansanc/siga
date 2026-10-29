import { auth, type AuthContext } from "@repo/auth";
import { prisma, runWithAuditActor, toDateColumn, type AuditActor } from "@repo/db";
import { institutionSlug, type Perfil } from "@repo/domain";

import "../auth-emails";
import { findOwnedOrganizationId } from "../services/memberships";

const tables = [
  "asignacion_aula",
  "aceptacion_politica",
  "intento_asistencia_fallido",
  "incidencia_estado",
  "incidencia",
  "asistencia_docente",
  "sesion_qr",
  "novedad_clase",
  "novedad",
  "estado_institucional",
  "clase_programada",
  "comision_seguida",
  "comision_docente",
  "horario",
  "comision",
  "dia_no_laborable",
  "periodo_lectivo",
  "materia",
  "carrera",
  "aula",
  "user_profile",
  "audit_log",
  "email_outbox",
  "rate_limit_bucket",
  "organization_settings",
  "invitation",
  "member",
  "organization",
  "verification",
  "account",
  "session",
  '"user"',
];

export const resetDatabase = async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(", ")} CASCADE`);
};

export type TestOrganization = {
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  actor: AuditActor;
};

// Una cuenta con su organización propia, donde es Administrador (y Bedel de SiGA).
export const createOrganization = async (
  suffix = crypto.randomUUID().slice(0, 8),
  slug = `organizacion-${suffix}`,
): Promise<TestOrganization> => {
  const user = await prisma.user.create({
    data: { id: `user-${suffix}`, name: `Usuario ${suffix}`, email: `${suffix}@test.local` },
  });
  const organization = await prisma.organization.create({
    data: {
      id: `org-${suffix}`,
      name: `Organización ${suffix}`,
      slug,
      createdAt: new Date(),
      members: {
        create: { id: `member-${suffix}`, userId: user.id, role: "owner", createdAt: new Date() },
      },
      profiles: { create: { userId: user.id, perfil: "BEDEL" } },
    },
  });
  return {
    userId: user.id,
    userEmail: user.email,
    organizationId: organization.id,
    organizationName: organization.name,
    actor: { userId: user.id, organizationId: organization.id },
  };
};

export const asOrganization = <T>(organization: TestOrganization, fn: () => Promise<T>) =>
  runWithAuditActor(organization.actor, fn);

export const countAuditLogs = (organizationId: string, entity?: string) =>
  prisma.auditLog.count({ where: { organizationId, ...(entity ? { entity } : {}) } });

// Sesión real de Better Auth para llamar a `auth.api.*` desde los tests: el plugin bearer
// firma el token y lo convierte en cookie de sesión.
export const signInAs = async (userId: string, activeOrganizationId?: string) => {
  const token = crypto.randomUUID().replaceAll("-", "");
  const now = new Date();
  await prisma.session.create({
    data: {
      id: `session-${token.slice(0, 12)}`,
      token,
      userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      activeOrganizationId: activeOrganizationId ?? (await findOwnedOrganizationId(userId)),
    },
  });
  return new Headers({ authorization: `Bearer ${token}` });
};

// Una cuenta con organización propia que además es miembro de `organization`.
export const createMember = async (
  organization: TestOrganization,
  suffix = crypto.randomUUID().slice(0, 8),
): Promise<TestOrganization> => {
  const own = await createOrganization(suffix);
  await prisma.member.create({
    data: {
      id: `member-${organization.organizationId}-${suffix}`,
      organizationId: organization.organizationId,
      userId: own.userId,
      role: "member",
      createdAt: new Date(),
    },
  });
  return own;
};

// ---------- SiGA ----------

// La institución (única, como la del seed): su Administrador es el bedel.
export const createInstitution = (suffix = crypto.randomUUID().slice(0, 8)) =>
  createOrganization(suffix, institutionSlug);

export type TestUser = { userId: string; userEmail: string; userName: string; perfil: Perfil };

// Una cuenta más de la institución, con el perfil pedido y sin organización propia.
export const createUserWithPerfil = async (
  institution: TestOrganization,
  perfil: Perfil,
  suffix = crypto.randomUUID().slice(0, 8),
): Promise<TestUser> => {
  const user = await prisma.user.create({
    data: {
      id: `${perfil.toLowerCase()}-${suffix}`,
      name: `${perfil} ${suffix}`,
      email: `${perfil.toLowerCase()}-${suffix}@test.local`,
      members: {
        create: {
          id: `member-${perfil.toLowerCase()}-${suffix}`,
          organizationId: institution.organizationId,
          role: "member",
          createdAt: new Date(),
        },
      },
      profile: { create: { organizationId: institution.organizationId, perfil } },
    },
  });
  return { userId: user.id, userEmail: user.email, userName: user.name, perfil };
};

export const authOf = (
  institution: TestOrganization,
  user: TestUser | TestOrganization,
): AuthContext => ({
  userId: user.userId,
  organizationId: institution.organizationId,
  role: user.userId === institution.userId ? "owner" : "member",
  perfil: "perfil" in user ? user.perfil : "BEDEL",
  userName: "userName" in user ? user.userName : `Usuario ${user.userId}`,
  userEmail: user.userEmail,
  lostOrganization: null,
});

export type AcademicFixture = {
  carreraId: string;
  materiaId: string;
  periodoLectivoId: string;
  comisionId: string;
  horarioId: string;
  aulaId: string;
  otraAulaId: string;
  docente: TestUser;
};

// Carrera, materia, período, comisión con un docente y un horario semanal en un aula.
export const seedAcademicFixture = async (
  institution: TestOrganization,
  options: {
    diaSemana?: number;
    horaInicio?: string;
    horaFin?: string;
    periodo?: [string, string];
  } = {},
): Promise<AcademicFixture> => {
  const organizationId = institution.organizationId;
  const docente = await createUserWithPerfil(institution, "DOCENTE");
  const [aula, otraAula] = await Promise.all([
    prisma.aula.create({
      data: {
        organizationId,
        codigo: "Aula 12",
        edificio: "Edificio A",
        piso: "1.º piso",
        capacidad: 60,
        equipamiento: ["Proyector"],
      },
    }),
    prisma.aula.create({
      data: {
        organizationId,
        codigo: "Aula 7",
        edificio: "Edificio B",
        piso: "PB",
        capacidad: 45,
        equipamiento: [],
      },
    }),
  ]);
  const carrera = await prisma.carrera.create({
    data: { organizationId, codigo: "K", nombre: "Ingeniería en Sistemas de Información" },
  });
  const materia = await prisma.materia.create({
    data: {
      organizationId,
      carreraId: carrera.id,
      codigo: "K5-PF",
      nombre: "Proyecto Final",
      anioCarrera: 5,
    },
  });
  const [inicio, fin] = options.periodo ?? ["2026-10-05", "2026-10-30"];
  const periodo = await prisma.periodoLectivo.create({
    data: {
      organizationId,
      nombre: "Período de prueba",
      fechaInicio: toDateColumn(inicio),
      fechaFin: toDateColumn(fin),
    },
  });
  const comision = await prisma.comision.create({
    data: {
      organizationId,
      materiaId: materia.id,
      periodoLectivoId: periodo.id,
      codigo: "5K2",
      turno: "NOCHE",
      anioLectivo: 2026,
      docentes: { create: { docenteId: docente.userId } },
      horarios: {
        create: {
          organizationId,
          diaSemana: options.diaSemana ?? 1,
          horaInicio: options.horaInicio ?? "19:00",
          horaFin: options.horaFin ?? "23:00",
          aulaHabitualId: aula.id,
        },
      },
    },
    include: { horarios: true },
  });
  return {
    carreraId: carrera.id,
    materiaId: materia.id,
    periodoLectivoId: periodo.id,
    comisionId: comision.id,
    horarioId: comision.horarios[0]!.id,
    aulaId: aula.id,
    otraAulaId: otraAula.id,
    docente,
  };
};

// Una clase suelta en una fecha y franja (hora argentina), Programada en el aula indicada.
export const createClase = (
  institution: TestOrganization,
  fixture: { comisionId: string; aulaId: string | null },
  fecha: string,
  horaInicio = "19:00",
  horaFin = "23:00",
  aulaId: string | null = fixture.aulaId,
) =>
  prisma.claseProgramada.create({
    data: {
      organizationId: institution.organizationId,
      comisionId: fixture.comisionId,
      fecha: toDateColumn(fecha),
      inicio: new Date(`${fecha}T${horaInicio}:00-03:00`),
      fin: new Date(`${fecha}T${horaFin}:00-03:00`),
      aulaId,
    },
  });

// El autorregistro por email exige verificar el correo: se registra, se marca verificado y se
// inicia sesión de verdad (con los hooks de `packages/auth`). Devuelve la cookie de la sesión.
export const signUpVerified = async (body: { name: string; email: string; password: string }) => {
  await auth.api.signUpEmail({ body });
  await prisma.user.update({ where: { email: body.email }, data: { emailVerified: true } });
  const { headers } = await auth.api.signInEmail({
    body: { email: body.email, password: body.password },
    returnHeaders: true,
  });
  return new Headers({ cookie: headers.get("set-cookie") ?? "" });
};
