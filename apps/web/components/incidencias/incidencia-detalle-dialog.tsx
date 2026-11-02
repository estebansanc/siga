"use client";

import {
  elementoIncidenciaLabels,
  siguienteEstadoIncidencia,
  type EstadoIncidencia,
} from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useState } from "react";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useIncidencia } from "@/hooks/use-incidencias";
import { formatFechaHora } from "@/lib/dates";

import { CambiarEstadoIncidenciaDialog } from "./cambiar-estado-incidencia-dialog";
import { IncidenciaEstadoBadge, IncidenciaGravedadBadge } from "./incidencia-badges";
import { ProponerFueraDeServicioDialog } from "./proponer-fuera-de-servicio-dialog";

type Accion = { tipo: "estado"; estado: EstadoIncidencia } | { tipo: "fuera-de-servicio" };

export function IncidenciaDetalleDialog({
  id,
  soloLectura = false,
  onClose,
}: {
  id: string;
  soloLectura?: boolean;
  onClose: () => void;
}) {
  const incidencia = useIncidencia(id);
  const detalle = incidencia.data;
  const [accion, setAccion] = useState<Accion | null>(null);
  const siguiente = detalle && !soloLectura ? siguienteEstadoIncidencia(detalle.estado) : null;
  const proponeFueraDeServicio =
    !soloLectura &&
    detalle?.gravedad === "IMPIDE_USO" &&
    detalle.estado !== "RESUELTA" &&
    detalle.aula.estado !== "FUERA_DE_SERVICIO";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {detalle
              ? `${detalle.aula.codigo} · ${elementoIncidenciaLabels[detalle.elemento]}`
              : "Incidencia"}
          </DialogTitle>
          <DialogDescription>
            {detalle
              ? `Reportada el ${formatFechaHora(detalle.createdAt)} por ${detalle.reportadaPor.nombre}`
              : " "}
          </DialogDescription>
        </DialogHeader>
        {!detalle ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <IncidenciaEstadoBadge estado={detalle.estado} />
              <IncidenciaGravedadBadge gravedad={detalle.gravedad} />
            </div>
            <p className="whitespace-pre-wrap text-sm">{detalle.descripcion}</p>
            {detalle.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada de R2, ya comprimida
              <img
                src={detalle.fotoUrl}
                alt="Foto de la incidencia"
                className="max-h-72 w-full rounded-lg border object-contain"
              />
            ) : null}
            {proponeFueraDeServicio ? (
              <Alert>
                <AlertTitle>Esta incidencia impide el uso del aula</AlertTitle>
                <AlertDescription className="flex flex-col items-start gap-2">
                  Podés pasar {detalle.aula.codigo} a Fuera de servicio.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAccion({ tipo: "fuera-de-servicio" })}
                  >
                    Pasar a Fuera de servicio
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Historial</h3>
              <ItemGroup className="gap-2">
                {detalle.historial.map((cambio) => (
                  <Item key={cambio.createdAt + cambio.estado} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>
                        <IncidenciaEstadoBadge estado={cambio.estado} />
                      </ItemTitle>
                      <ItemDescription>
                        {formatFechaHora(cambio.createdAt)} · {cambio.usuario.nombre}
                      </ItemDescription>
                      {cambio.observaciones ? (
                        <p className="text-sm">{cambio.observaciones}</p>
                      ) : null}
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </section>
            {siguiente ? (
              <Button
                type="button"
                onClick={() => setAccion({ tipo: "estado", estado: siguiente })}
              >
                {siguiente === "RESUELTA" ? "Resolver" : "Pasar a En curso"}
              </Button>
            ) : null}
          </div>
        )}
      </FormDialogContent>
      {detalle && accion?.tipo === "estado" ? (
        <CambiarEstadoIncidenciaDialog
          incidencia={detalle}
          estado={accion.estado}
          onClose={() => setAccion(null)}
        />
      ) : null}
      {detalle && accion?.tipo === "fuera-de-servicio" ? (
        <ProponerFueraDeServicioDialog aula={detalle.aula} onClose={() => setAccion(null)} />
      ) : null}
    </Dialog>
  );
}
