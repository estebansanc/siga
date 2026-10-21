"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

import { useHistorialEstadoInstitucional } from "@/hooks/use-estado-institucional";
import { formatFechaHora } from "@/lib/dates";

import { EstadoInstitucionBadge } from "./estado-indicator";

export function HistorialTable() {
  const historial = useHistorialEstadoInstitucional();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
        <CardDescription>
          Registro inmutable con fecha, hora, estado, motivo y usuario responsable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!historial.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : historial.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay cambios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.data.map((registro) => (
                  <TableRow key={registro.id ?? registro.desde}>
                    <TableCell className="whitespace-nowrap">
                      {formatFechaHora(registro.desde)}
                    </TableCell>
                    <TableCell>
                      <EstadoInstitucionBadge estado={registro} />
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      {registro.motivo ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {registro.usuario?.nombre ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
