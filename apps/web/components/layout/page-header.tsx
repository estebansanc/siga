import { Separator } from "@repo/ui/components/separator";
import { SidebarTrigger } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AvisosUrgentesIndicator } from "@/components/avisos/avisos-urgentes-indicator";
import { EstadoIndicator } from "@/components/estado-institucional/estado-indicator";

// El indicador de estado institucional va en todas las pantallas (RF-08).
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-auto mr-2"
      />
      <h1 className="truncate text-base font-semibold">{title}</h1>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {children}
        <AvisosUrgentesIndicator />
        <EstadoIndicator />
      </div>
    </header>
  );
}
