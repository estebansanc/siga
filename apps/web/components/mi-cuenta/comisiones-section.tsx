"use client";

import type { ComisionDto } from "@repo/api/client";
import { turnoLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCarreras, useComisiones, useMaterias } from "@/hooks/use-datos-academicos";
import { useActualizarPreferencias, usePreferencias } from "@/hooks/use-preferencias";
import { showRequestError } from "@/lib/form-errors";

const anios = ["1", "2", "3", "4", "5", "6"];

const describirComision = (comision: ComisionDto) =>
  `${comision.materia.anioCarrera}.º año · ${turnoLabels[comision.turno]} · ${comision.docentes.map((docente) => docente.nombre).join(", ") || "Sin docente"}`;

// RF-17 / CUR-03: comisiones seguidas, buscador por carrera, año y materia; cada acción se guarda al momento.
export function ComisionesSection() {
  const preferencias = usePreferencias();
  const actualizar = useActualizarPreferencias();
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const seguidas = preferencias.data?.comisiones ?? null;
  const [filtro, setFiltro] = useState({ carreraId: "", anio: "", materiaId: "" });
  const carreras = useCarreras();
  const materias = useMaterias({ carreraId: filtro.carreraId, anio: filtro.anio });
  const comisiones = useComisiones(filtro, Boolean(filtro.materiaId));

  const actuales = seguidas?.map((comision) => comision.id) ?? [];
  const guardando = actualizar.isPending || enCurso !== null;

  // Cada guardado reemplaza la lista completa, por eso se bloquea todo mientras dura.
  const guardar = async (comisionId: string, comisionIds: string[], mensaje: string) => {
    setEnCurso(comisionId);
    try {
      await actualizar.mutateAsync({ comisionIds });
      toast.success(mensaje);
    } catch (error) {
      showRequestError(error);
    } finally {
      setEnCurso(null);
    }
  };
  const agregar = (comision: ComisionDto) =>
    guardar(comision.id, [...actuales, comision.id], "Comisión agregada");
  const quitar = (comision: ComisionDto) =>
    guardar(
      comision.id,
      actuales.filter((id) => id !== comision.id),
      "Comisión quitada",
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Comisiones que seguís</CardTitle>
          <CardDescription>
            Mis clases de hoy muestra solo las clases de estas comisiones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seguidas === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : seguidas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Todavía no seguís ninguna comisión. Buscala abajo y agregala.
            </p>
          ) : (
            <ItemGroup className="gap-2">
              {seguidas.map((comision) => (
                <Item key={comision.id} variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      {comision.materia.nombre}
                      <Badge variant="secondary">{comision.codigo}</Badge>
                    </ItemTitle>
                    <ItemDescription>{describirComision(comision)}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={guardando}
                      onClick={() => void quitar(comision)}
                    >
                      {enCurso === comision.id ? <Spinner /> : null}
                      Quitar
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar comisión</CardTitle>
          <CardDescription>Elegí carrera, año y materia para ver sus comisiones.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="pref-carrera">Carrera</FieldLabel>
              <NativeSelect
                id="pref-carrera"
                className="w-full"
                value={filtro.carreraId}
                onChange={(event) =>
                  setFiltro({ carreraId: event.target.value, anio: "", materiaId: "" })
                }
              >
                <NativeSelectOption value="">Elegí una carrera</NativeSelectOption>
                {carreras.data?.map((carrera) => (
                  <NativeSelectOption key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="pref-anio">Año</FieldLabel>
              <NativeSelect
                id="pref-anio"
                className="w-full"
                value={filtro.anio}
                onChange={(event) =>
                  setFiltro((actual) => ({ ...actual, anio: event.target.value, materiaId: "" }))
                }
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
              <FieldLabel htmlFor="pref-materia">Materia</FieldLabel>
              <NativeSelect
                id="pref-materia"
                className="w-full"
                value={filtro.materiaId}
                onChange={(event) =>
                  setFiltro((actual) => ({ ...actual, materiaId: event.target.value }))
                }
              >
                <NativeSelectOption value="">Elegí una materia</NativeSelectOption>
                {materias.data?.map((materia) => (
                  <NativeSelectOption key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
          {!filtro.materiaId ? null : !comisiones.data ? (
            <Skeleton className="h-14 w-full" />
          ) : comisiones.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Esa materia no tiene comisiones activas.
            </p>
          ) : (
            <ItemGroup className="gap-2">
              {comisiones.data.map((comision) => {
                const yaSeguida = actuales.includes(comision.id);
                return (
                  <Item key={comision.id} variant="outline">
                    <ItemContent>
                      <ItemTitle>
                        {comision.materia.nombre}
                        <Badge variant="secondary">{comision.codigo}</Badge>
                      </ItemTitle>
                      <ItemDescription>{describirComision(comision)}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={yaSeguida || guardando}
                        onClick={() => void agregar(comision)}
                        aria-label={`Agregar ${comision.codigo} de ${comision.materia.nombre}`}
                      >
                        {enCurso === comision.id ? <Spinner /> : <PlusIcon />}
                        {yaSeguida ? "Agregada" : "Agregar"}
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
