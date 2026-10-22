"use client";

import type { ClaseDto } from "@repo/api/client";
import { metodoAsistenciaLabels, type GenerarQrInput } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CircleCheckIcon, CircleDashedIcon } from "lucide-react";

import { useClasesDelTurno } from "@/hooks/use-qr";

function AsistenciaBadge({ asistencia }: { asistencia: ClaseDto["asistencia"] }) {
  if (!asistencia) {
    return (
      <Badge variant="outline">
        <CircleDashedIcon />
        Sin registro
      </Badge>
    );
  }
  return (
    <Badge>
      <CircleCheckIcon />
      {metodoAsistenciaLabels[asistencia.metodo]} · {asistencia.horaLlegada}
    </Badge>
  );
}

export function ClasesDelTurno({ consulta }: { consulta: GenerarQrInput }) {
  const clases = useClasesDelTurno(consulta);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clases del turno</CardTitle>
      </CardHeader>
      <CardContent>
        {clases.data ? (
          <ItemGroup className="gap-2">
            {clases.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">El aula no tiene clases en el turno.</p>
            ) : null}
            {clases.data.map((clase) => (
              <Item key={clase.id} variant="outline" data-clase-id={clase.id}>
                <ItemContent>
                  <ItemTitle>
                    {clase.materia.nombre}
                    <Badge variant="secondary">{clase.comision.codigo}</Badge>
                  </ItemTitle>
                  <ItemDescription>
                    {clase.horaInicio} – {clase.horaFin} ·{" "}
                    {clase.docentes.map((docente) => docente.nombre).join(", ") ||
                      "Sin docente asignado"}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <AsistenciaBadge asistencia={clase.asistencia} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </CardContent>
    </Card>
  );
}
