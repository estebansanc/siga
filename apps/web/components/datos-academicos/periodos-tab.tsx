"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { PeriodoGestionDto } from "@repo/api/client";
import { crearPeriodoSchema, type CrearPeriodo } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarPeriodo,
  useCrearPeriodo,
  useDarDeBajaPeriodo,
  usePeriodosGestion,
  useReactivarPeriodo,
} from "@/hooks/use-datos-academicos";
import { formatFechaCorta } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";
import { GenerarClasesDialog } from "./generar-clases-dialog";

function PeriodoFormDialog({
  periodo,
  onClose,
}: {
  periodo?: PeriodoGestionDto;
  onClose: () => void;
}) {
  const crear = useCrearPeriodo();
  const actualizar = useActualizarPeriodo();
  const form = useForm<CrearPeriodo>({
    resolver: zodResolver(crearPeriodoSchema),
    defaultValues: {
      nombre: periodo?.nombre ?? "",
      fechaInicio: periodo?.fechaInicio ?? "",
      fechaFin: periodo?.fechaFin ?? "",
    },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearPeriodo) => {
    try {
      if (periodo) await actualizar.mutateAsync({ id: periodo.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(periodo ? "Período actualizado" : "Período creado");
      onClose();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <EntidadFormDialog
      titulo={periodo ? `Editar ${periodo.nombre}` : "Nuevo período"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="periodo-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="periodo-nombre" {...form.register("nombre")} />
      </CampoEntidad>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoEntidad id="periodo-inicio" label="Inicio" error={errors.fechaInicio?.message}>
          <Input id="periodo-inicio" type="date" {...form.register("fechaInicio")} />
        </CampoEntidad>
        <CampoEntidad id="periodo-fin" label="Fin" error={errors.fechaFin?.message}>
          <Input id="periodo-fin" type="date" {...form.register("fechaFin")} />
        </CampoEntidad>
      </div>
    </EntidadFormDialog>
  );
}

export function PeriodosTab() {
  const [bajas, setBajas] = useState(false);
  const periodos = usePeriodosGestion(bajas);
  const darDeBaja = useDarDeBajaPeriodo();
  const reactivar = useReactivarPeriodo();
  const dialogo = useDialogoEntidad<PeriodoGestionDto>();
  const [generando, setGenerando] = useState<PeriodoGestionDto | null>(null);

  return (
    <>
      <EntidadSection
        titulo="Períodos lectivos"
        descripcion="Las comisiones se dictan dentro de un período. Desde acá se generan sus clases."
        nuevoLabel="Nuevo período"
        filas={periodos.data?.map((periodo) => ({
          id: periodo.id,
          titulo: periodo.nombre,
          descripcion: `${formatFechaCorta(periodo.fechaInicio)} al ${formatFechaCorta(periodo.fechaFin)}`,
          activo: periodo.activo,
          acciones: [{ etiqueta: "Generar clases", onSelect: () => setGenerando(periodo) }],
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) =>
          dialogo.abrirEdicion(periodos.data!.find((periodo) => periodo.id === id)!)
        }
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <PeriodoFormDialog periodo={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
      {generando ? (
        <GenerarClasesDialog
          nombre={generando.nombre}
          alcance={{ periodoLectivoId: generando.id }}
          onClose={() => setGenerando(null)}
        />
      ) : null}
    </>
  );
}
