"use client";

import type { ClaseDto } from "@repo/api/client";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { ItemGroup } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CalendarOffIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ClaseCard } from "./clase-card";
import { ClaseDetailDialog } from "./clase-detail-dialog";

export function ClasesSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="Cargando clases">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function ClasesEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarOffIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}

// Tarjetas de clase con el detalle en un pop-up; cada uso decide qué mostrar sin clases.
export function ClasesList({
  clases,
  emptyState,
  renderActions,
}: {
  clases: ClaseDto[] | undefined;
  emptyState: ReactNode;
  renderActions?: (clase: ClaseDto) => ReactNode;
}) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  if (!clases) return <ClasesSkeleton />;
  if (clases.length === 0) return <>{emptyState}</>;

  return (
    <>
      <ItemGroup className="gap-2">
        {clases.map((clase) => (
          <ClaseCard
            key={clase.id}
            clase={clase}
            onSelect={() => setSeleccionada(clase.id)}
            actions={renderActions?.(clase)}
          />
        ))}
      </ItemGroup>
      <ClaseDetailDialog
        claseId={seleccionada}
        onOpenChange={(open) => !open && setSeleccionada(null)}
      />
    </>
  );
}
