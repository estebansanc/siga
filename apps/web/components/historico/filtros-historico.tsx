"use client";

import { diasRangoInicialHistorico, fechaArgentina, sumarDias } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
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
import { SearchXIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";

import { useCarreras, useComisiones, useMaterias } from "@/hooks/use-datos-academicos";
import { useOpcionesHistorico } from "@/hooks/use-historico";

export type Filtros = {
  desde: string;
  hasta: string;
  carreraId: string;
  materiaId: string;
  comisionId: string;
  docenteId: string;
  aulaId: string;
  tipo: string;
  origen: string;
};

export type ErroresFiltros = Partial<Record<"desde" | "hasta", string>>;

export const filtrosIniciales = (): Filtros => {
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
    origen: "",
  };
};

type Esquema<T> = { safeParse: (valor: unknown) => z.ZodSafeParseResult<T> };

export const validar = <T,>(esquema: Esquema<T>, filtros: Filtros, pagina: number) => {
  const resultado = esquema.safeParse({ ...filtros, pagina });
  if (resultado.success) return { consulta: resultado.data, errores: {} as ErroresFiltros };
  const errores: ErroresFiltros = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0];
    if ((campo === "desde" || campo === "hasta") && !errores[campo]) errores[campo] = issue.message;
  }
  return { consulta: null, errores };
};

export function FiltrosForm({
  children,
  filtros,
  errores,
  onCambiar,
  onConsultar,
}: {
  children?: ReactNode;
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
        {children}
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

export function Paginador({
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

export function CargandoResultados() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function SinRegistros() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Sin registros para el período</EmptyTitle>
        <EmptyDescription>Probá con otro rango de fechas o con menos filtros.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export const dependientes: Partial<Record<keyof Filtros, (keyof Filtros)[]>> = {
  carreraId: ["materiaId", "comisionId"],
  materiaId: ["comisionId"],
};

// Arranca con los últimos 30 días ya consultados; los errores del rango se muestran junto al
// campo y no consultan.
export const useFiltrosHistoricos = <T extends { pagina: number }>(esquema: Esquema<T>) => {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [errores, setErrores] = useState<ErroresFiltros>({});
  const [consulta, setConsulta] = useState<T | null>(
    () => validar(esquema, filtrosIniciales(), 1).consulta,
  );

  const cambiar = (campo: keyof Filtros, valor: string) =>
    setFiltros((actual) => ({
      ...actual,
      [campo]: valor,
      ...Object.fromEntries((dependientes[campo] ?? []).map((dependiente) => [dependiente, ""])),
    }));

  const consultar = () => {
    const validada = validar(esquema, filtros, 1);
    setErrores(validada.errores);
    if (validada.consulta) setConsulta(validada.consulta);
  };

  const irAPagina = (pagina: number) => setConsulta((actual) => actual && { ...actual, pagina });

  return { filtros, errores, consulta, cambiar, consultar, irAPagina };
};
