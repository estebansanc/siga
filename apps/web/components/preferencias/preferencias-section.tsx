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
import { Switch } from "@repo/ui/components/switch";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCarreras, useComisiones, useMaterias } from "@/hooks/use-datos-academicos";
import { useActualizarPreferencias, usePreferencias } from "@/hooks/use-preferencias";
import { showRequestError } from "@/lib/form-errors";

type OpcionesDeCorreo = {
  notificarNovedadesPorCorreo: boolean;
  notificarAvisosPorCorreo: boolean;
};

const anios = ["1", "2", "3", "4", "5", "6"];

const describirComision = (comision: ComisionDto) =>
  `${comision.materia.anioCarrera}.º año · ${turnoLabels[comision.turno]} · ${comision.docentes.map((docente) => docente.nombre).join(", ") || "Sin docente"}`;

// RF-17 / CUR-03: comisiones seguidas, buscador por carrera, año y materia, y Guardar.
export function PreferenciasSection() {
  const preferencias = usePreferencias();
  const actualizar = useActualizarPreferencias();
  // Lo guardado es el punto de partida; en cuanto el estudiante edita, manda su lista.
  const [editadas, setEditadas] = useState<ComisionDto[] | null>(null);
  const seguidas = editadas ?? preferencias.data?.comisiones ?? null;
  const [filtro, setFiltro] = useState({ carreraId: "", anio: "", materiaId: "" });
  const carreras = useCarreras();
  const materias = useMaterias({ carreraId: filtro.carreraId, anio: filtro.anio });
  const comisiones = useComisiones(filtro, Boolean(filtro.materiaId));

  const [opcionesEditadas, setOpcionesEditadas] = useState<OpcionesDeCorreo | null>(null);
  const opciones: OpcionesDeCorreo | null = preferencias.data
    ? (opcionesEditadas ?? {
        notificarNovedadesPorCorreo: preferencias.data.notificarNovedadesPorCorreo,
        notificarAvisosPorCorreo: preferencias.data.notificarAvisosPorCorreo,
      })
    : null;

  const guardadas = preferencias.data?.comisiones.map((comision) => comision.id) ?? [];
  const actuales = seguidas?.map((comision) => comision.id) ?? [];
  const cambiaronComisiones =
    actuales.length !== guardadas.length || actuales.some((id) => !guardadas.includes(id));
  const cambiaronOpciones =
    opcionesEditadas !== null &&
    (opcionesEditadas.notificarNovedadesPorCorreo !==
      preferencias.data?.notificarNovedadesPorCorreo ||
      opcionesEditadas.notificarAvisosPorCorreo !== preferencias.data?.notificarAvisosPorCorreo);
  const hayCambios = cambiaronComisiones || cambiaronOpciones;

  const cambiarOpcion = (opcion: keyof OpcionesDeCorreo, activada: boolean) => {
    if (opciones) setOpcionesEditadas({ ...opciones, [opcion]: activada });
  };

  const agregar = (comision: ComisionDto) => setEditadas([...(seguidas ?? []), comision]);
  const quitar = (comision: ComisionDto) =>
    setEditadas((seguidas ?? []).filter((item) => item.id !== comision.id));

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({ comisionIds: actuales, ...opciones });
      setEditadas(null);
      setOpcionesEditadas(null);
      toast.success("Preferencias guardadas");
    } catch (error) {
      showRequestError(error);
    }
  };

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
                    <Button variant="ghost" size="sm" onClick={() => quitar(comision)}>
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
                        disabled={yaSeguida}
                        onClick={() => agregar(comision)}
                        aria-label={`Agregar ${comision.codigo} de ${comision.materia.nombre}`}
                      >
                        <PlusIcon />
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

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones por correo</CardTitle>
          <CardDescription>
            Elegí qué correos querés recibir. Por defecto están desactivados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch
                id="pref-correo-novedades"
                disabled={!opciones}
                checked={opciones?.notificarNovedadesPorCorreo ?? false}
                onCheckedChange={(activada) =>
                  cambiarOpcion("notificarNovedadesPorCorreo", activada)
                }
              />
              <FieldLabel htmlFor="pref-correo-novedades">Recibir novedades por correo</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="pref-correo-avisos"
                disabled={!opciones}
                checked={opciones?.notificarAvisosPorCorreo ?? false}
                onCheckedChange={(activada) => cambiarOpcion("notificarAvisosPorCorreo", activada)}
              />
              <FieldLabel htmlFor="pref-correo-avisos">
                Recibir avisos institucionales por correo
              </FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={!hayCambios || actualizar.isPending} onClick={() => void guardar()}>
          {actualizar.isPending ? <Spinner /> : null}
          Guardar
        </Button>
      </div>
    </div>
  );
}
