"use client";

import { consultaNovedadesSchema, tipoNovedadLabels, tipoNovedadSchema } from "@repo/domain";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { ItemGroup } from "@repo/ui/components/item";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";

import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "@/components/historico/filtros-historico";
import { useHistorialNovedades } from "@/hooks/use-novedades";

import { NovedadItem } from "./novedad-item";

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

// RF-09 / CA-06: novedades finalizadas o sin clases por delante, de solo lectura, por fecha de
// publicación. Un rango inválido muestra su mensaje y deja la lista como estaba.
export function HistorialNovedades() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaNovedadesSchema);
  const resultado = useHistorialNovedades(consulta);

  return (
    <div className="flex flex-col gap-6">
      <FiltrosForm
        alcance="ninguno"
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
      {!resultado.data ? (
        <CargandoResultados />
      ) : (
        <div className="flex flex-col gap-4">
          <Indicadores total={resultado.data.total} porTipo={resultado.data.porTipo} />
          {resultado.data.total === 0 ? (
            <SinRegistros />
          ) : (
            <>
              <ItemGroup className="gap-2">
                {resultado.data.novedades.map((novedad) => (
                  <NovedadItem key={novedad.id} novedad={novedad} puedeGestionar={false} />
                ))}
              </ItemGroup>
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
