"use client";

import type { ConsultaIncidenciasResultadoDto, IncidenciaHistoricaDto } from "@repo/api/client";
import { consultaIncidenciasSchema, elementoIncidenciaLabels } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { useState } from "react";

import { FormDialogContent } from "@/components/form-dialog-content";
import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "@/components/historico/filtros-historico";
import { useHistorialIncidencias } from "@/hooks/use-incidencias";
import { formatFechaHora } from "@/lib/dates";

import { IncidenciaEstadoBadge, IncidenciaGravedadBadge } from "./incidencia-badges";

function Indicadores({ total }: Pick<ConsultaIncidenciasResultadoDto, "total">) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicadores">
      <Card size="sm">
        <CardContent>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="text-2xl font-semibold">{total}</dd>
        </CardContent>
      </Card>
    </dl>
  );
}

// Solo lectura: una incidencia resuelta ya no cambia de estado.
function HistorialDialog({
  incidencia,
  onClose,
}: {
  incidencia: IncidenciaHistoricaDto;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {incidencia.aula} · {elementoIncidenciaLabels[incidencia.elemento]}
          </DialogTitle>
          <DialogDescription>
            Reportada el {formatFechaHora(incidencia.reportadaEn)} por {incidencia.reportadaPor}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm">{incidencia.descripcion}</p>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Historial</h3>
          <ItemGroup className="gap-2">
            {incidencia.historial.map((cambio) => (
              <Item key={cambio.createdAt + cambio.estado} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>
                    <IncidenciaEstadoBadge estado={cambio.estado} />
                  </ItemTitle>
                  <ItemDescription>
                    {formatFechaHora(cambio.createdAt)} · {cambio.usuario.nombre}
                  </ItemDescription>
                  {cambio.observaciones ? <p className="text-sm">{cambio.observaciones}</p> : null}
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </section>
      </FormDialogContent>
    </Dialog>
  );
}

function DetalleIncidencias({ incidencias }: { incidencias: IncidenciaHistoricaDto[] }) {
  const [abierta, setAbierta] = useState<IncidenciaHistoricaDto | null>(null);

  return (
    <>
      <ItemGroup className="gap-2" aria-label="Incidencias resueltas">
        {incidencias.map((incidencia) => (
          <Item key={incidencia.id} variant="outline">
            <ItemContent>
              <ItemTitle>
                {incidencia.aula} · {elementoIncidenciaLabels[incidencia.elemento]}
                <IncidenciaEstadoBadge estado={incidencia.estado} />
                <IncidenciaGravedadBadge gravedad={incidencia.gravedad} />
              </ItemTitle>
              <ItemDescription>
                {formatFechaHora(incidencia.reportadaEn)} · {incidencia.reportadaPor}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Detalle de ${incidencia.aula} ${elementoIncidenciaLabels[incidencia.elemento]}`}
                onClick={() => setAbierta(incidencia)}
              >
                Detalle
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
      {abierta ? <HistorialDialog incidencia={abierta} onClose={() => setAbierta(null)} /> : null}
    </>
  );
}

// RF-09 / CA-06 / EF-5: incidencias resueltas, de solo lectura, por fecha del reporte. Un rango
// inválido muestra su mensaje y deja la lista como estaba.
export function HistorialIncidencias() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaIncidenciasSchema);
  const resultado = useHistorialIncidencias(consulta);

  return (
    <div className="flex flex-col gap-6">
      <FiltrosForm
        alcance="aula"
        filtros={filtros}
        errores={errores}
        onCambiar={cambiar}
        onConsultar={consultar}
      />
      {!resultado.data ? (
        <CargandoResultados />
      ) : (
        <div className="flex flex-col gap-4">
          <Indicadores total={resultado.data.total} />
          {resultado.data.total === 0 ? (
            <SinRegistros />
          ) : (
            <>
              <DetalleIncidencias incidencias={resultado.data.incidencias} />
              <Paginador
                pagina={resultado.data.pagina}
                totalPaginas={resultado.data.totalPaginas}
                onCambiar={irAPagina}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
