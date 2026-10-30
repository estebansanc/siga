import type { MemberRole, Perfil } from "@repo/domain";
import {
  BellIcon,
  BookOpenIcon,
  CalendarSearchIcon,
  CalendarDaysIcon,
  CircleDotIcon,
  CircleHelpIcon,
  DatabaseIcon,
  DoorOpenIcon,
  HistoryIcon,
  InboxIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  QrCodeIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = { title: string; href: NavigationHref; icon: LucideIcon };

// Las rutas de la app, como las conoce Next (rutas tipadas).
export type NavigationHref =
  | "/"
  | "/clases"
  | "/novedades"
  | "/estado-institucional"
  | "/preferencias"
  | "/avisos"
  | "/asistencia"
  | "/aulas"
  | "/qr"
  | "/solicitudes"
  | "/incidencias"
  | "/usuarios"
  | "/datos-academicos"
  | "/historico"
  | "/configuracion"
  | "/ayuda";

const misClases: NavigationItem = { title: "Mis clases", href: "/", icon: CalendarDaysIcon };
const clases: NavigationItem = { title: "Clases", href: "/clases", icon: CalendarSearchIcon };
const avisos: NavigationItem = { title: "Avisos", href: "/avisos", icon: BellIcon };
const novedades: NavigationItem = { title: "Novedades", href: "/novedades", icon: MegaphoneIcon };
const estado: NavigationItem = {
  title: "Estado institucional",
  href: "/estado-institucional",
  icon: CircleDotIcon,
};
const datosAcademicos: NavigationItem = {
  title: "Datos académicos",
  href: "/datos-academicos",
  icon: DatabaseIcon,
};
const usuarios: NavigationItem = { title: "Usuarios", href: "/usuarios", icon: UsersIcon };
const consultasHistoricas: NavigationItem = {
  title: "Consultas históricas",
  href: "/historico",
  icon: HistoryIcon,
};
const incidencias: NavigationItem = {
  title: "Incidencias",
  href: "/incidencias",
  icon: TriangleAlertIcon,
};
const aulas: NavigationItem = { title: "Aulas", href: "/aulas", icon: DoorOpenIcon };
const configuracion: NavigationItem = {
  title: "Configuración",
  href: "/configuracion",
  icon: Settings2Icon,
};

const ayuda: NavigationItem = { title: "Ayuda", href: "/ayuda", icon: CircleHelpIcon };

const asistenciaDocente: NavigationItem = {
  title: "Asistencia docente",
  href: "/qr",
  icon: QrCodeIcon,
};
const solicitudes: NavigationItem = { title: "Solicitudes", href: "/solicitudes", icon: InboxIcon };

// Una sección sin título es un grupo plano (el menú de Estudiante y Docente, y Ayuda).
export type NavigationSection = { title?: string; items: NavigationItem[] };

const flat = (items: NavigationItem[]): NavigationSection[] => [{ items }];

// El menú de cada perfil sigue los mockups (M2–M8, D1–D8). Bedel y Autoridad, que tienen más
// ítems, los agrupan en secciones.
const navigationByPerfil: Record<
  Perfil,
  (configuracionItems: NavigationItem[]) => NavigationSection[]
> = {
  ESTUDIANTE: (configuracionItems) =>
    flat([
      misClases,
      clases,
      avisos,
      { title: "Preferencias", href: "/preferencias", icon: SlidersHorizontalIcon },
      ...configuracionItems,
    ]),
  DOCENTE: (configuracionItems) =>
    flat([
      misClases,
      { title: "Asistencia", href: "/asistencia", icon: QrCodeIcon },
      novedades,
      avisos,
      { title: "Solicitudes de aula", href: "/solicitudes", icon: InboxIcon },
      clases,
      ...configuracionItems,
    ]),
  BEDEL: (configuracionItems) => [
    { title: "Hoy", items: [estado, clases, novedades, asistenciaDocente] },
    { title: "Aulas", items: [aulas, solicitudes, incidencias] },
    { title: "Comunicación", items: [avisos] },
    {
      title: "Administración",
      items: [usuarios, datosAcademicos, consultasHistoricas, ...configuracionItems],
    },
  ],
  AUTORIDAD: (configuracionItems) => [
    { title: "Hoy", items: [clases, estado, novedades] },
    { title: "Aulas", items: [aulas, incidencias] },
    { title: "Comunicación", items: [avisos] },
    {
      title: "Administración",
      items: [usuarios, datosAcademicos, consultasHistoricas, ...configuracionItems],
    },
  ],
};

// Configuración sigue siendo del Administrador de la organización, cualquiera sea su perfil:
// cierra Administración, o va al final del menú plano. Ayuda siempre es la última entrada,
// sin título de sección.
export const navigationFor = (perfil: Perfil, role: MemberRole): NavigationSection[] => [
  ...navigationByPerfil[perfil](role === "owner" ? [configuracion] : []),
  { items: [ayuda] },
];

export const brandIcon = LayoutGridIcon;
export const sectionIcon = BookOpenIcon;

export const navigationItemsFor = (perfil: Perfil, role: MemberRole): NavigationItem[] =>
  navigationFor(perfil, role).flatMap((section) => section.items);
