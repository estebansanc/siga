"use client";

import type { NovedadHistoricaDto } from "@repo/api/client";
import {
  consultaNovedadesSchema,
  tipoNovedadLabels,
  tipoNovedadSchema,
  type ConsultaNovedades,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

import { useConsultaNovedades } from "@/hooks/use-historico";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "./filtros-historico";

const rangoDeClases = ({ fechaClaseDesde, fechaClaseHasta }: NovedadHistoricaDto) => {
  if (!fechaClaseDesde) return "—";
  if (fechaClaseDesde === fechaClaseHasta) return formatFechaCorta(fechaClaseDesde);
  return `${formatFechaCorta(fechaClaseDesde)} al ${formatFechaCorta(fechaClaseHasta!)}`;
};

function Indicadores({
  total,
  porTipo,
}: {
  total: number;
  porTipo: Record<keyof typeof tipoNovedadLabels, number>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Indicadores">
      <Card size="sm">
        <CardContent>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="text-2xl font-semibold">{total}</dd>
        </CardContent>
      </Card>
      {tipoNovedadSchema.options.map((tipo) => (
        <Card key={tipo} size="sm">
          <CardContent>
            <dt className="text-muted-foreground text-xs">{tipoNovedadLabels[tipo]}</dt>
            <dd className="text-2xl font-semibold">{porTipo[tipo]}</dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}

function DetalleNovedades({ novedades }: { novedades: NovedadHistoricaDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Publicada</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Materia y comisión</TableHead>
          <TableHead>Fecha de la clase</TableHead>
          <TableHead>Docentes</TableHead>
          <TableHead>Publicó</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {novedades.map((novedad) => (
          <TableRow key={novedad.id}>
            <TableCell className="whitespace-nowrap">
              {formatFechaHora(novedad.publicadaEn)}
            </TableCell>
            <TableCell>{tipoNovedadLabels[novedad.tipo]}</TableCell>
            <TableCell>
              {novedad.materia} · {novedad.comision}
            </TableCell>
            <TableCell className="whitespace-nowrap">{rangoDeClases(novedad)}</TableCell>
            <TableCell>{novedad.docentes.join(", ")}</TableCell>
            <TableCell>
              {novedad.publicadaPor}
              {novedad.publicadaPorBedelia ? " (bedelía)" : null}
            </TableCell>
            <TableCell>
              <Badge variant={novedad.estado === "ACTIVA" ? "default" : "outline"}>
                {novedad.estado === "ACTIVA" ? "Activa" : "Finalizada"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Resultados({
  consulta,
  onPagina,
}: {
  consulta: ConsultaNovedades;
  onPagina: (pagina: number) => void;
}) {
  const resultado = useConsultaNovedades(consulta);
  if (!resultado.data) return <CargandoResultados />;

  const { total, porTipo, novedades, pagina, totalPaginas } = resultado.data;
  return (
    <div className="flex flex-col gap-4">
      <Indicadores total={total} porTipo={porTipo} />
      {total === 0 ? (
        <SinRegistros />
      ) : (
        <>
          <DetalleNovedades novedades={novedades} />
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={onPagina} />
        </>
      )}
    </div>
  );
}

// RF-09 / CA-06: consulta histórica de novedades.
export function HistoricoNovedades() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaNovedadesSchema);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novedades</CardTitle>
        <CardDescription>
          Novedades publicadas en el período, por fecha de publicación. El rango puede abarcar hasta
          12 meses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FiltrosForm
          filtros={filtros}
          errores={errores}
          onCambiar={cambiar}
          onConsultar={consultar}
        >
          <Field>
            <FieldLabel htmlFor="historico-tipo">Tipo de novedad</FieldLabel>
            <NativeSelect
              id="historico-tipo"
              className="w-full"
              value={filtros.tipo}
              onChange={(event) => cambiar("tipo", event.target.value)}
            >
              <NativeSelectOption value="">Todos</NativeSelectOption>
              {tipoNovedadSchema.options.map((tipo) => (
                <NativeSelectOption key={tipo} value={tipo}>
                  {tipoNovedadLabels[tipo]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FiltrosForm>
        {consulta ? <Resultados consulta={consulta} onPagina={irAPagina} /> : null}
      </CardContent>
    </Card>
  );
}
