"use client";

import type { MeDto } from "@repo/api/client";
import type { MemberRole } from "@repo/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { LayoutGridIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { useMe } from "@/hooks/use-me";
import { productName } from "@/lib/product";

import { NavUser } from "./nav-user";
import { navigationFor } from "./navigation";

// La sesión está fija en la institución: la barra muestra la marca del producto y su nombre,
// con link al inicio.
function AppIdentity({ institutionName }: { institutionName: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" render={<Link href="/" />}>
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <LayoutGridIcon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{productName}</span>
            <span className="text-muted-foreground truncate text-xs">{institutionName}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname.startsWith(href);

export function AppSidebar({
  role,
  me,
  ...props
}: ComponentProps<typeof Sidebar> & { role: MemberRole; me: MeDto }) {
  const pathname = usePathname();
  const { data: activeMe = me } = useMe(me);
  // En móvil el menú es un panel lateral: elegir una sección navega y lo cierra.
  const { setOpenMobile } = useSidebar();
  // El menú depende del perfil de SiGA; Configuración, del Administrador de la organización.
  const visibleNavigation = navigationFor(activeMe.perfil, role);
  const institutionName =
    activeMe.organizations.find((organization) => organization.id === activeMe.organizationId)
      ?.name ?? "";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppIdentity institutionName={institutionName} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleNavigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActivePath(pathname, item.href)}
                  render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* `activeMe` viene de la base, no de la cookie de sesión: un cambio hecho en Mi perfil
            se ve acá sin recargar. */}
        <NavUser user={{ name: activeMe.userName, email: activeMe.userEmail }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
