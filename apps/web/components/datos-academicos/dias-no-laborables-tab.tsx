"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { DiaNoLaborableGestionDto } from "@repo/api/client";
import { crearDiaNoLaborableSchema, type CrearDiaNoLaborable } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarDiaNoLaborable,
  useCrearDiaNoLaborable,
  useDarDeBajaDiaNoLaborable,
  useDiasNoLaborablesGestion,
  useReactivarDiaNoLaborable,
} from "@/hooks/use-datos-academicos";
import { formatFechaCorta } from "@/lib/dates";
import { showSaveError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";

function DiaNoLaborableFormDialog({
  dia,
  onClose,
}: {
  dia?: DiaNoLaborableGestionDto;
  onClose: () => void;
}) {
  const crear = useCrearDiaNoLaborable();
  const actualizar = useActualizarDiaNoLaborable();
  const form = useForm<CrearDiaNoLaborable>({
    resolver: zodResolver(crearDiaNoLaborableSchema),
    defaultValues: { fecha: dia?.fecha ?? "", motivo: dia?.motivo ?? "" },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearDiaNoLaborable) => {
    try {
      if (dia) await actualizar.mutateAsync({ id: dia.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(dia ? "Día no laborable actualizado" : "Día no laborable creado");
      onClose();
    } catch (error) {
      showSaveError(error, form.setError, "fecha");
    }
  };

  return (
    <EntidadFormDialog
      titulo={dia ? "Editar día no laborable" : "Nuevo día no laborable"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="dia-fecha" label="Fecha" error={errors.fecha?.message}>
        <Input id="dia-fecha" type="date" {...form.register("fecha")} />
      </CampoEntidad>
      <CampoEntidad id="dia-motivo" label="Motivo" error={errors.motivo?.message}>
        <Input id="dia-motivo" {...form.register("motivo")} />
      </CampoEntidad>
    </EntidadFormDialog>
  );
}

export function DiasNoLaborablesTab() {
  const [bajas, setBajas] = useState(false);
  const dias = useDiasNoLaborablesGestion(bajas);
  const darDeBaja = useDarDeBajaDiaNoLaborable();
  const reactivar = useReactivarDiaNoLaborable();
  const dialogo = useDialogoEntidad<DiaNoLaborableGestionDto>();

  return (
    <>
      <EntidadSection
        titulo="Días no laborables"
        descripcion="No se generan clases esos días. Los que se carguen después no tocan las clases ya generadas."
        nuevoLabel="Nuevo día no laborable"
        filas={dias.data?.map((dia) => ({
          id: dia.id,
          titulo: formatFechaCorta(dia.fecha),
          descripcion: dia.motivo,
          activo: dia.activo,
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) => dialogo.abrirEdicion(dias.data!.find((dia) => dia.id === id)!)}
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <DiaNoLaborableFormDialog dia={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
    </>
  );
}
