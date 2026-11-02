"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { HorarioGestionDto } from "@repo/api/client";
import {
  crearHorarioSchema,
  diasSemana,
  nombreDiaSemana,
  type CrearHorario,
  type CrearHorarioInput,
} from "@repo/domain";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { TimeInput } from "@repo/ui/components/time-input";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarHorario,
  useAulasHabituales,
  useComisionesGestion,
  useCrearHorario,
  useDarDeBajaHorario,
  useHorariosGestion,
  useReactivarHorario,
} from "@/hooks/use-datos-academicos";
import { showSaveError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";

function HorarioFormDialog({
  horario,
  onClose,
}: {
  horario?: HorarioGestionDto;
  onClose: () => void;
}) {
  const comisiones = useComisionesGestion(false);
  const aulas = useAulasHabituales();
  const crear = useCrearHorario();
  const actualizar = useActualizarHorario();
  const form = useForm<CrearHorarioInput, unknown, CrearHorario>({
    resolver: zodResolver(crearHorarioSchema),
    defaultValues: {
      comisionId: horario?.comision.id ?? "",
      diaSemana: horario?.diaSemana ?? 1,
      horaInicio: horario?.horaInicio ?? "",
      horaFin: horario?.horaFin ?? "",
      aulaHabitualId: horario?.aulaHabitual?.id ?? "",
    },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearHorario) => {
    try {
      if (horario) await actualizar.mutateAsync({ id: horario.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(horario ? "Horario actualizado" : "Horario creado");
      onClose();
    } catch (error) {
      showSaveError(error, form.setError, "aulaHabitualId");
    }
  };

  return (
    <EntidadFormDialog
      titulo={horario ? "Editar horario" : "Nuevo horario"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="horario-comision" label="Comisión" error={errors.comisionId?.message}>
        <NativeSelect
          id="horario-comision"
          className="w-full"
          disabled={Boolean(horario)}
          {...form.register("comisionId")}
        >
          <NativeSelectOption value="">Elegí la comisión</NativeSelectOption>
          {comisiones.data?.map((comision) => (
            <NativeSelectOption key={comision.id} value={comision.id}>
              {comision.codigo} · {comision.materia.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
      <CampoEntidad id="horario-dia" label="Día" error={errors.diaSemana?.message}>
        <NativeSelect id="horario-dia" className="w-full" {...form.register("diaSemana")}>
          {diasSemana.map((dia) => (
            <NativeSelectOption key={dia.valor} value={dia.valor}>
              {dia.etiqueta}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoEntidad id="horario-inicio" label="Desde" error={errors.horaInicio?.message}>
          <Controller
            control={form.control}
            name="horaInicio"
            render={({ field }) => (
              <TimeInput
                id="horario-inicio"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.horaInicio)}
              />
            )}
          />
        </CampoEntidad>
        <CampoEntidad id="horario-fin" label="Hasta" error={errors.horaFin?.message}>
          <Controller
            control={form.control}
            name="horaFin"
            render={({ field }) => (
              <TimeInput
                id="horario-fin"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.horaFin)}
              />
            )}
          />
        </CampoEntidad>
      </div>
      <CampoEntidad id="horario-aula" label="Aula habitual" error={errors.aulaHabitualId?.message}>
        <NativeSelect id="horario-aula" className="w-full" {...form.register("aulaHabitualId")}>
          <NativeSelectOption value="">Sin aula habitual</NativeSelectOption>
          {aulas.data?.map((aula) => (
            <NativeSelectOption key={aula.id} value={aula.id}>
              {aula.codigo} · {aula.edificio}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
    </EntidadFormDialog>
  );
}

export function HorariosTab() {
  const [bajas, setBajas] = useState(false);
  const horarios = useHorariosGestion(bajas);
  const darDeBaja = useDarDeBajaHorario();
  const reactivar = useReactivarHorario();
  const dialogo = useDialogoEntidad<HorarioGestionDto>();

  return (
    <>
      <EntidadSection
        titulo="Horarios"
        descripcion="Franja semanal de cada comisión, en hora argentina. Editarlos mueve sus clases futuras."
        nuevoLabel="Nuevo horario"
        filas={horarios.data?.map((horario) => ({
          id: horario.id,
          titulo: `${horario.comision.codigo} · ${horario.comision.materia}`,
          descripcion: `${nombreDiaSemana(horario.diaSemana)} ${horario.horaInicio} – ${horario.horaFin} · ${
            horario.aulaHabitual?.codigo ?? "Sin aula habitual"
          }`,
          activo: horario.activo,
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) =>
          dialogo.abrirEdicion(horarios.data!.find((horario) => horario.id === id)!)
        }
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <HorarioFormDialog horario={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
    </>
  );
}
