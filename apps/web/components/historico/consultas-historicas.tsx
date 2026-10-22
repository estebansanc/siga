"use client";

import type { NovedadHistoricaDto } from "@repo/api/client";
import {
  consultaNovedadesSchema,
  diasRangoInicialHistorico,
  fechaArgentina,
  sumarDias,
  tipoNovedadLabels,
  tipoNovedadSchema,
  type ConsultaNovedades,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/pagination";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { SearchXIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useCarreras, useComisiones, useMaterias } from "@/hooks/use-datos-academicos";
import { useConsultaNovedades, useOpcionesHistorico } from "@/hooks/use-historico";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

type Filtros = {
  desde: string;
  hasta: string;
  carreraId: string;
  materiaId: string;
  comisionId: string;
  docenteId: string;
  aulaId: string;
  tipo: string;
};

type ErroresFiltros = Partial<Record<"desde" | "hasta", string>>;

const filtrosIniciales = (): Filtros => {
  const hoy = fechaArgentina(new Date());
  return {
    desde: sumarDias(hoy, -diasRangoInicialHistorico),
    hasta: hoy,
    carreraId: "",
    materiaId: "",
    comisionId: "",
    docenteId: "",
    aulaId: "",
    tipo: "",
  };
};

const validar = (filtros: Filtros, pagina: number) => {
  const resultado = consultaNovedadesSchema.safeParse({ ...filtros, pagina });
  if (resultado.success) return { consulta: resultado.data, errores: {} as ErroresFiltros };
  const errores: ErroresFiltros = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0];
    if ((campo === "desde" || campo === "hasta") && !errores[campo]) errores[campo] = issue.message;
  }
  return { consulta: null, errores };
};

const rangoDeClases = ({ fechaClaseDesde, fechaClaseHasta }: NovedadHistoricaDto) => {
  if (!fechaClaseDesde) return "—";
  if (fechaClaseDesde === fechaClaseHasta) return formatFechaCorta(fechaClaseDesde);
  return `${formatFechaCorta(fechaClaseDesde)} al ${formatFechaCorta(fechaClaseHasta!)}`;
};

function FiltrosForm({
  filtros,
  errores,
  onCambiar,
  onConsultar,
}: {
  filtros: Filtros;
  errores: ErroresFiltros;
  onCambiar: (campo: keyof Filtros, valor: string) => void;
  onConsultar: () => void;
}) {
  const carreras = useCarreras();
  const materias = useMaterias({ carreraId: filtros.carreraId });
  const comisiones = useComisiones({ carreraId: filtros.carreraId, materiaId: filtros.materiaId });
  const opciones = useOpcionesHistorico();

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    onConsultar();
  };

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field data-invalid={Boolean(errores.desde)}>
          <FieldLabel htmlFor="historico-desde">Desde</FieldLabel>
          <Input
            id="historico-desde"
            type="date"
            value={filtros.desde}
            aria-invalid={Boolean(errores.desde)}
            onChange={(event) => onCambiar("desde", event.target.value)}
          />
          <FieldError>{errores.desde}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errores.hasta)}>
          <FieldLabel htmlFor="historico-hasta">Hasta</FieldLabel>
          <Input
            id="historico-hasta"
            type="date"
            value={filtros.hasta}
            aria-invalid={Boolean(errores.hasta)}
            onChange={(event) => onCambiar("hasta", event.target.value)}
          />
          <FieldError>{errores.hasta}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-tipo">Tipo de novedad</FieldLabel>
          <NativeSelect
            id="historico-tipo"
            className="w-full"
            value={filtros.tipo}
            onChange={(event) => onCambiar("tipo", event.target.value)}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {tipoNovedadSchema.options.map((tipo) => (
              <NativeSelectOption key={tipo} value={tipo}>
                {tipoNovedadLabels[tipo]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-carrera">Carrera</FieldLabel>
          <NativeSelect
            id="historico-carrera"
            className="w-full"
            value={filtros.carreraId}
            onChange={(event) => onCambiar("carreraId", event.target.value)}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {carreras.data?.map((carrera) => (
              <NativeSelectOption key={carrera.id} value={carrera.id}>
                {carrera.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-materia">Materia</FieldLabel>
          <NativeSelect
            id="historico-materia"
            className="w-full"
            value={filtros.materiaId}
            onChange={(event) => onCambiar("materiaId", event.target.value)}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {materias.data?.map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-comision">Comisión</FieldLabel>
          <NativeSelect
            id="historico-comision"
            className="w-full"
            value={filtros.comisionId}
            onChange={(event) => onCambiar("comisionId", event.target.value)}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {comisiones.data?.map((comision) => (
              <NativeSelectOption key={comision.id} value={comision.id}>
                {comision.codigo} · {comision.materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-docente">Docente</FieldLabel>
          <NativeSelect
            id="historico-docente"
            className="w-full"
            value={filtros.docenteId}
            onChange={(event) => onCambiar("docenteId", event.target.value)}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {opciones.data?.docentes.map((docente) => (
              <NativeSelectOption key={docente.id} value={docente.id}>
                {docente.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="historico-aula">Aula</FieldLabel>
          <NativeSelect
            id="historico-aula"
            className="w-full"
            value={filtros.aulaId}
            onChange={(event) => onCambiar("aulaId", event.target.value)}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {opciones.data?.aulas.map((aula) => (
              <NativeSelectOption key={aula.id} value={aula.id}>
                {aula.codigo}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>
      <div>
        <Button type="submit">Consultar</Button>
      </div>
    </form>
  );
}

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

function Paginador({
  pagina,
  totalPaginas,
  onCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}) {
  const ir = (destino: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    onCambiar(destino);
  };
  const primera = pagina <= 1;
  const ultima = pagina >= totalPaginas;
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Anterior"
            aria-label="Página anterior"
            aria-disabled={primera}
            className={primera ? "pointer-events-none opacity-50" : undefined}
            onClick={primera ? (event) => event.preventDefault() : ir(pagina - 1)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="text-muted-foreground px-2 text-sm">
            Página {pagina} de {totalPaginas}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Siguiente"
            aria-label="Página siguiente"
            aria-disabled={ultima}
            className={ultima ? "pointer-events-none opacity-50" : undefined}
            onClick={ultima ? (event) => event.preventDefault() : ir(pagina + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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

  if (!resultado.data) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  const { total, porTipo, novedades, pagina, totalPaginas } = resultado.data;
  return (
    <div className="flex flex-col gap-4">
      <Indicadores total={total} porTipo={porTipo} />
      {total === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Sin registros para el período</EmptyTitle>
            <EmptyDescription>Probá con otro rango de fechas o con menos filtros.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <DetalleNovedades novedades={novedades} />
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={onPagina} />
        </>
      )}
    </div>
  );
}

const dependientes: Partial<Record<keyof Filtros, (keyof Filtros)[]>> = {
  carreraId: ["materiaId", "comisionId"],
  materiaId: ["comisionId"],
};

// RF-09 / CA-06: consulta histórica de novedades. Arranca con los últimos 30 días ya
// consultados; los errores del rango se muestran junto al campo y no consultan.
export function ConsultasHistoricas() {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [errores, setErrores] = useState<ErroresFiltros>({});
  const [consulta, setConsulta] = useState<ConsultaNovedades | null>(
    () => validar(filtrosIniciales(), 1).consulta,
  );

  const cambiar = (campo: keyof Filtros, valor: string) =>
    setFiltros((actual) => ({
      ...actual,
      [campo]: valor,
      ...Object.fromEntries((dependientes[campo] ?? []).map((dependiente) => [dependiente, ""])),
    }));

  const consultar = () => {
    const validada = validar(filtros, 1);
    setErrores(validada.errores);
    if (validada.consulta) setConsulta(validada.consulta);
  };

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
        />
        {consulta ? (
          <Resultados
            consulta={consulta}
            onPagina={(pagina) => setConsulta({ ...consulta, pagina })}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
