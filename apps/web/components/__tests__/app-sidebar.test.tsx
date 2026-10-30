import type { MeDto } from "@repo/api/client";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { productName } from "@/lib/product";
import { renderWithProviders } from "@/test/render";

const routerSpies = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const pathnameState = vi.hoisted(() => ({ current: "/" }));

vi.mock("@/hooks/use-me", () => ({
  useMe: (initialData: MeDto) => ({ data: initialData }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
  useRouter: () => routerSpies,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const user = { name: "Ana Demo", email: "demo@example.com" };

const ownOrganization = {
  id: "org-own",
  name: "Organización de Demo",
  slug: "demo",
  role: "owner" as const,
};

const otherOrganization = {
  id: "org-otra",
  name: "Organización Norte",
  slug: "norte",
  role: "member" as const,
};

const meOf = (
  organizations: MeDto["organizations"] = [ownOrganization],
  perfil: MeDto["perfil"] = "BEDEL",
): MeDto => ({
  userId: "u1",
  userName: user.name,
  userEmail: user.email,
  dni: null,
  legajo: null,
  bajaSolicitadaEn: null,
  organizationId: organizations[0].id,
  role: "owner",
  perfil,
  organizations,
  politicaPendiente: false,
  lostOrganization: null,
});

const renderSidebar = (role: "owner" | "member" = "owner", me: MeDto = meOf()) =>
  renderWithProviders(
    <SidebarProvider>
      <AppSidebar role={role} me={me} />
    </SidebarProvider>,
  );

beforeEach(() => {
  pathnameState.current = "/";
  routerSpies.push.mockClear();
  routerSpies.refresh.mockClear();
});

// Los ítems del menú, sin la marca (que lleva también el nombre de la institución).
const linkNames = () =>
  [...document.querySelectorAll<HTMLAnchorElement>('[data-slot="sidebar-menu-button"]')]
    .slice(1)
    .map((link) => link.textContent?.trim());

const sectionsOf = () =>
  [...document.querySelectorAll('[role="group"]')].map((group) => ({
    title: group.querySelector('[data-slot="sidebar-group-label"]')?.textContent,
    items: [...group.querySelectorAll('[data-slot="sidebar-menu-button"]')].map((link) =>
      link.textContent?.trim(),
    ),
  }));

describe("AppSidebar", () => {
  it("el bedel Administrador ve el menú de bedelía y Configuración, con Estado institucional activo", () => {
    pathnameState.current = "/estado-institucional";
    renderSidebar("owner", meOf([ownOrganization], "BEDEL"));
    expect(linkNames()).toEqual([
      "Estado institucional",
      "Clases",
      "Novedades",
      "Asistencia docente",
      "Aulas",
      "Solicitudes",
      "Incidencias",
      "Avisos",
      "Usuarios",
      "Datos académicos",
      "Consultas históricas",
      "Configuración",
      "Ayuda",
    ]);
    expect(sectionsOf()).toEqual([
      {
        title: "Hoy",
        items: ["Estado institucional", "Clases", "Novedades", "Asistencia docente"],
      },
      { title: "Aulas", items: ["Aulas", "Solicitudes", "Incidencias"] },
      { title: "Comunicación", items: ["Avisos"] },
      {
        title: "Administración",
        items: ["Usuarios", "Datos académicos", "Consultas históricas", "Configuración"],
      },
    ]);
    expect(screen.getByRole("group", { name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ayuda" }).closest('[role="group"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Estado institucional" })).toHaveAttribute(
      "data-active",
    );
    expect(screen.getByRole("link", { name: "Configuración" })).toHaveAttribute(
      "href",
      "/configuracion",
    );
  });

  it("el estudiante ve Mis clases, Clases, Avisos, sin Preferencias ni Configuración", () => {
    renderSidebar("member", meOf([ownOrganization], "ESTUDIANTE"));
    expect(linkNames()).toEqual(["Mis clases", "Clases", "Avisos", "Ayuda"]);
    expect(screen.getByRole("link", { name: "Mis clases" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Mis clases" })).toHaveAttribute("data-active");
  });

  it("el menú plano de Estudiante y Docente no lleva títulos de sección", () => {
    renderSidebar("member", meOf([ownOrganization], "ESTUDIANTE"));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="sidebar-group-label"]')).toBeNull();
  });

  it("sin ser Administrador, el bedel no ve Configuración y Administración termina en Consultas históricas", () => {
    renderSidebar("member", meOf([ownOrganization], "BEDEL"));
    expect(screen.queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
    expect(sectionsOf().at(-1)?.items.at(-1)).toBe("Consultas históricas");
  });

  it("el docente ve Asistencia, Novedades, Avisos y Solicitudes de aula; la autoridad, Consultas históricas, Estado y Usuarios", () => {
    pathnameState.current = "/novedades";
    const docente = renderSidebar("member", meOf([ownOrganization], "DOCENTE"));
    expect(linkNames()).toEqual([
      "Mis clases",
      "Asistencia",
      "Novedades",
      "Avisos",
      "Solicitudes de aula",
      "Clases",
      "Ayuda",
    ]);
    expect(screen.getByRole("link", { name: "Novedades" })).toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: "Mis clases" })).not.toHaveAttribute("data-active");
    docente.unmount();

    renderSidebar("member", meOf([ownOrganization], "AUTORIDAD"));
    expect(linkNames()).toEqual([
      "Clases",
      "Estado institucional",
      "Novedades",
      "Aulas",
      "Incidencias",
      "Avisos",
      "Usuarios",
      "Datos académicos",
      "Consultas históricas",
      "Ayuda",
    ]);
    expect(sectionsOf().map((section) => section.title)).toEqual([
      "Hoy",
      "Aulas",
      "Comunicación",
      "Administración",
    ]);
  });

  it("muestra el nombre de la institución bajo la marca del producto", () => {
    renderSidebar("owner", meOf([{ ...ownOrganization, name: "UTN Facultad Regional Tucumán" }]));
    expect(screen.getByText("UTN Facultad Regional Tucumán")).toBeInTheDocument();
  });

  it("el pie muestra el nombre y el email de quién soy, no de la cookie", () => {
    renderSidebar("owner", { ...meOf(), userName: "Nombre actualizado" });
    expect(screen.getByText("Nombre actualizado")).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.queryByText(user.name)).not.toBeInTheDocument();
  });

  it("con más de una organización muestra la marca del producto con link al inicio", () => {
    renderSidebar("owner", meOf([ownOrganization, otherOrganization]));
    expect(screen.getByRole("link", { name: new RegExp(productName) })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
