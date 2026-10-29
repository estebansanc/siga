"use client";

import type { ConsultaIncidenciasResultadoDto, IncidenciaHistoricaDto } from "@repo/api/client";
import {
  consultaIncidenciasSchema,
  elementoIncidenciaLabels,
  estadoIncidenciaSchema,
  type ConsultaIncidencias,
  type EstadoIncidencia,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { useState } from "react";

import { FormDialogContent } from "@/components/form-dialog-content";
import {
  IncidenciaEstadoBadge,
  IncidenciaGravedadBadge,
} from "@/components/incidencias/incidencia-badges";
import { useConsultaIncidencias } from "@/hooks/use-historico";
import { formatFechaHora } from "@/lib/dates";

import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "./filtros-historico";

const rotulosIndicador: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abiertas",
  EN_CURSO: "En curso",
  RESUELTA: "Resueltas",
};

function Indicadores({
  total,
  porEstado,
}: Pick<ConsultaIncidenciasResultadoDto, "total" | "porEstado">) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicadores">
      <Card size="sm">
        <CardContent>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="text-2xl font-semibold">{total}</dd>
        </CardContent>
      </Card>
      {estadoIncidenciaSchema.options.map((estado) => (
        <Card key={estado} size="sm">
          <CardContent>
            <dt className="text-muted-foreground text-xs">{rotulosIndicador[estado]}</dt>
            <dd className="text-2xl font-semibold">{porEstado[estado]}</dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}

// Solo lectura: gestionar los estados sigue en Incidencias.
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
      <Table aria-label="Incidencias">
        <TableHeader>
          <TableRow>
            <TableHead>Reportada</TableHead>
            <TableHead>Aula</TableHead>
            <TableHead>Elemento</TableHead>
            <TableHead>Gravedad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Reportó</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidencias.map((incidencia) => (
            <TableRow key={incidencia.id}>
              <TableCell className="whitespace-nowrap">
                {formatFechaHora(incidencia.reportadaEn)}
              </TableCell>
              <TableCell>{incidencia.aula}</TableCell>
              <TableCell>{elementoIncidenciaLabels[incidencia.elemento]}</TableCell>
              <TableCell>
                <IncidenciaGravedadBadge gravedad={incidencia.gravedad} />
              </TableCell>
              <TableCell>
                <IncidenciaEstadoBadge estado={incidencia.estado} />
              </TableCell>
              <TableCell>{incidencia.reportadaPor}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Ver historial de ${incidencia.aula} ${elementoIncidenciaLabels[incidencia.elemento]}`}
                  onClick={() => setAbierta(incidencia)}
                >
                  Ver historial
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {abierta ? <HistorialDialog incidencia={abierta} onClose={() => setAbierta(null)} /> : null}
    </>
  );
}

function Resultados({
  consulta,
  onPagina,
}: {
  consulta: ConsultaIncidencias;
  onPagina: (pagina: number) => void;
}) {
  const resultado = useConsultaIncidencias(consulta);
  if (!resultado.data) return <CargandoResultados />;

  const { total, porEstado, incidencias, pagina, totalPaginas } = resultado.data;
  return (
    <div className="flex flex-col gap-4">
      <Indicadores total={total} porEstado={porEstado} />
      {total === 0 ? (
        <SinRegistros />
      ) : (
        <>
          <DetalleIncidencias incidencias={incidencias} />
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={onPagina} />
        </>
      )}
    </div>
  );
}

// RF-09 / CA-06 / EF-5: incidencias de aulas del período, por fecha del reporte.
export function HistoricoIncidencias() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaIncidenciasSchema);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incidencias</CardTitle>
        <CardDescription>
          Incidencias de aulas reportadas en el período, con su estado actual y el historial de
          estados. El rango puede abarcar hasta 12 meses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FiltrosForm
          soloAula
          filtros={filtros}
          errores={errores}
          onCambiar={cambiar}
          onConsultar={consultar}
        />
        {consulta ? <Resultados consulta={consulta} onPagina={irAPagina} /> : null}
      </CardContent>
    </Card>
  );
}
