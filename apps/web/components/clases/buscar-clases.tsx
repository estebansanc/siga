"use client";

import { fechaArgentina } from "@repo/domain";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { useState } from "react";

import { useClases } from "@/hooks/use-clases";
import { useCarreras, useComisiones, useMaterias } from "@/hooks/use-datos-academicos";
import { capitalizarPrimera, formatFechaLarga } from "@/lib/dates";

import { ClasesEmpty, ClasesList } from "./clases-list";

const anios = ["1", "2", "3", "4", "5", "6"];

type Filtros = {
  fecha: string;
  carreraId: string;
  anio: string;
  materiaId: string;
  comisionId: string;
};

// RF-07: filtros combinables por carrera, año, materia, comisión y fecha (CA-04).
export function BuscarClases() {
  const [filtros, setFiltros] = useState<Filtros>({
    fecha: fechaArgentina(new Date()),
    carreraId: "",
    anio: "",
    materiaId: "",
    comisionId: "",
  });
  const carreras = useCarreras();
  const materias = useMaterias({ carreraId: filtros.carreraId, anio: filtros.anio });
  const comisiones = useComisiones({
    carreraId: filtros.carreraId,
    anio: filtros.anio,
    materiaId: filtros.materiaId,
  });
  const clases = useClases({ ambito: "todas", ...filtros });

  // Cambiar un filtro de arriba invalida los de abajo que dependen de él.
  const cambiar = (campo: keyof Filtros, value: string) =>
    setFiltros((actual) => ({
      ...actual,
      [campo]: value,
      ...(campo === "carreraId" || campo === "anio" ? { materiaId: "", comisionId: "" } : {}),
      ...(campo === "materiaId" ? { comisionId: "" } : {}),
    }));

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field>
          <FieldLabel htmlFor="filtro-fecha">Fecha</FieldLabel>
          <Input
            id="filtro-fecha"
            type="date"
            value={filtros.fecha}
            onChange={(event) => cambiar("fecha", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-carrera">Carrera</FieldLabel>
          <NativeSelect
            id="filtro-carrera"
            className="w-full"
            value={filtros.carreraId}
            onChange={(event) => cambiar("carreraId", event.target.value)}
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
          <FieldLabel htmlFor="filtro-anio">Año</FieldLabel>
          <NativeSelect
            id="filtro-anio"
            className="w-full"
            value={filtros.anio}
            onChange={(event) => cambiar("anio", event.target.value)}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {anios.map((anio) => (
              <NativeSelectOption key={anio} value={anio}>
                {anio}.º año
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-materia">Materia</FieldLabel>
          <NativeSelect
            id="filtro-materia"
            className="w-full"
            value={filtros.materiaId}
            onChange={(event) => cambiar("materiaId", event.target.value)}
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
          <FieldLabel htmlFor="filtro-comision">Comisión</FieldLabel>
          <NativeSelect
            id="filtro-comision"
            className="w-full"
            value={filtros.comisionId}
            onChange={(event) => cambiar("comisionId", event.target.value)}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {comisiones.data?.map((comision) => (
              <NativeSelectOption key={comision.id} value={comision.id}>
                {comision.codigo} · {comision.materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>
      <h2 className="font-medium">
        {filtros.fecha ? capitalizarPrimera(formatFechaLarga(filtros.fecha)) : "Elegí una fecha"}
      </h2>
      <ClasesList
        clases={clases.data?.clases}
        emptyState={<ClasesEmpty title="No se encontraron clases" />}
      />
    </div>
  );
}
