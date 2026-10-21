"use client";

import { Skeleton } from "@repo/ui/components/skeleton";
import type { ReactNode } from "react";

import { useOrganizationSwitch } from "./organization-switch-provider";
import { PageBody } from "./page-body";
import { PageHeader } from "./page-header";

// El estado de "cambiando de organización" lo ve todo el shell, no solo la barra: acá se
// reemplaza el contenido de CUALQUIER pantalla por un esqueleto genérico, así ninguna pantalla
// llega a mostrar datos de la organización anterior mientras `setActive` y el `refresh()`
// todavía están en curso.
export function OrganizationSwitchContent({ children }: { children: ReactNode }) {
  const { isSwitching } = useOrganizationSwitch();

  if (!isSwitching) return <>{children}</>;

  return (
    <>
      <PageHeader title={<Skeleton className="h-5 w-32" />} estado={false} />
      <PageBody>
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-9 w-full sm:max-w-sm" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </PageBody>
    </>
  );
}
