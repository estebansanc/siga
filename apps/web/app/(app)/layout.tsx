import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LostOrganizationNotice } from "@/components/layout/lost-organization-notice";
import { getMeCached } from "@/lib/me-cache";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const me = await getMeCached(session);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar role={session.role} me={me} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <LostOrganizationNotice me={me} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
