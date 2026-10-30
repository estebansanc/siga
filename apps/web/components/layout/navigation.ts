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
  | "/aulas/solicitar"
  | "/aulas/mis-solicitudes"
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
const aulas: NavigationItem = { title: "Aulas", href: "/aulas", icon: DoorOpenIcon };
const configuracion: NavigationItem = {
  title: "Configuración",
  href: "/configuracion",
  icon: Settings2Icon,
};

const ayuda: NavigationItem = { title: "Ayuda", href: "/ayuda", icon: CircleHelpIcon };

// El menú de cada perfil sigue los mockups (M2–M8, D1–D8); las secciones que todavía no
// entraron muestran "Próximamente".
const navigationByPerfil: Record<Perfil, NavigationItem[]> = {
  ESTUDIANTE: [
    misClases,
    clases,
    avisos,
    { title: "Preferencias", href: "/preferencias", icon: SlidersHorizontalIcon },
  ],
  DOCENTE: [
    misClases,
    { title: "Asistencia", href: "/asistencia", icon: QrCodeIcon },
    novedades,
    avisos,
    aulas,
    clases,
  ],
  BEDEL: [
    estado,
    clases,
    novedades,
    aulas,
    { title: "QR de asistencia", href: "/qr", icon: QrCodeIcon },
    { title: "Solicitudes", href: "/solicitudes", icon: InboxIcon },
    { title: "Incidencias", href: "/incidencias", icon: TriangleAlertIcon },
    consultasHistoricas,
    avisos,
    usuarios,
    datosAcademicos,
  ],
  AUTORIDAD: [clases, consultasHistoricas, avisos, aulas, estado, usuarios, datosAcademicos],
};

// Configuración sigue siendo del Administrador de la organización, cualquiera sea su perfil.
// Ayuda siempre es la última entrada.
export const navigationFor = (perfil: Perfil, role: MemberRole): NavigationItem[] => [
  ...navigationByPerfil[perfil],
  ...(role === "owner" ? [configuracion] : []),
  ayuda,
];

export const brandIcon = LayoutGridIcon;
export const sectionIcon = BookOpenIcon;
