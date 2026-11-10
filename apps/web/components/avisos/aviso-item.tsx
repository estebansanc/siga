import type { AvisoDto } from "@repo/api/client";
import { Badge } from "@repo/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@repo/ui/components/item";
import { cn } from "@repo/ui/lib/utils";
import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { tonoClassNames } from "@/components/estado-tonos";
import { formatFechaHora } from "@/lib/dates";

export function UrgenteBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1", tonoClassNames.rojo, className)}>
      <TriangleAlertIcon aria-hidden="true" />
      Urgente
    </Badge>
  );
}

export function AvisoItem({ aviso, children }: { aviso: AvisoDto; children?: ReactNode }) {
  return (
    <Item variant="outline" className="items-start">
      <ItemContent>
        <ItemTitle>
          {aviso.titulo}
          {aviso.prioridad === "URGENTE" ? <UrgenteBadge /> : null}
        </ItemTitle>
        <ItemDescription className="line-clamp-none whitespace-pre-line">
          {aviso.cuerpo}
        </ItemDescription>
        <ItemDescription className="text-xs">
          Vigente del {formatFechaHora(aviso.desde)} al {formatFechaHora(aviso.hasta)} ·{" "}
          {aviso.publicadoPor.nombre}
        </ItemDescription>
        {aviso.finalizadoEn ? (
          <ItemDescription className="text-xs">
            Finalizado
            {aviso.finalizadoPor ? ` por ${aviso.finalizadoPor.nombre}` : ""} el{" "}
            {formatFechaHora(aviso.finalizadoEn)}
          </ItemDescription>
        ) : null}
        {children}
      </ItemContent>
    </Item>
  );
}
