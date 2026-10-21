import type { AulaGestionDto } from "@repo/api/client";
import { estadoAulaLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";

// "Ocupada" se calcula y prevalece sobre el estado editable mientras haya una clase en curso.
export function AulaEstadoBadge({
  aula,
}: {
  aula: Pick<AulaGestionDto, "estado" | "ocupada" | "activa">;
}) {
  if (!aula.activa) return <Badge variant="outline">Dada de baja</Badge>;
  if (aula.ocupada) return <Badge variant="destructive">Ocupada</Badge>;
  return (
    <Badge variant={aula.estado === "DISPONIBLE" ? "default" : "secondary"}>
      {estadoAulaLabels[aula.estado]}
    </Badge>
  );
}
