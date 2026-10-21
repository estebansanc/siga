import type { AulaClaseDto } from "@repo/api/client";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";

import { formatFechaCorta } from "@/lib/dates";

export function AulaClasesList({ clases, vacio }: { clases: AulaClaseDto[]; vacio: string }) {
  if (clases.length === 0) return <p className="text-muted-foreground text-sm">{vacio}</p>;
  return (
    <ItemGroup className="max-h-64 gap-2 overflow-y-auto">
      {clases.map((clase) => (
        <Item key={clase.id} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>
              {clase.materia} · {clase.comision}
            </ItemTitle>
            <ItemDescription>
              {formatFechaCorta(clase.fecha)} · {clase.horaInicio} – {clase.horaFin}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
