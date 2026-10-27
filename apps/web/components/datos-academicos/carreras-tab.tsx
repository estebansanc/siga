"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CarreraGestionDto } from "@repo/api/client";
import { crearCarreraSchema, type CrearCarrera } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarCarrera,
  useCarrerasGestion,
  useCrearCarrera,
  useDarDeBajaCarrera,
  useReactivarCarrera,
} from "@/hooks/use-datos-academicos";
import { showSaveError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";

function CarreraFormDialog({
  carrera,
  onClose,
}: {
  carrera?: CarreraGestionDto;
  onClose: () => void;
}) {
  const crear = useCrearCarrera();
  const actualizar = useActualizarCarrera();
  const form = useForm<CrearCarrera>({
    resolver: zodResolver(crearCarreraSchema),
    defaultValues: { codigo: carrera?.codigo ?? "", nombre: carrera?.nombre ?? "" },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearCarrera) => {
    try {
      if (carrera) await actualizar.mutateAsync({ id: carrera.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(carrera ? "Carrera actualizada" : "Carrera creada");
      onClose();
    } catch (error) {
      showSaveError(error, form.setError, "codigo");
    }
  };

  return (
    <EntidadFormDialog
      titulo={carrera ? `Editar ${carrera.codigo}` : "Nueva carrera"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="carrera-codigo" label="Código" error={errors.codigo?.message}>
        <Input id="carrera-codigo" {...form.register("codigo")} />
      </CampoEntidad>
      <CampoEntidad id="carrera-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="carrera-nombre" {...form.register("nombre")} />
      </CampoEntidad>
    </EntidadFormDialog>
  );
}

export function CarrerasTab() {
  const [bajas, setBajas] = useState(false);
  const carreras = useCarrerasGestion(bajas);
  const darDeBaja = useDarDeBajaCarrera();
  const reactivar = useReactivarCarrera();
  const dialogo = useDialogoEntidad<CarreraGestionDto>();

  return (
    <>
      <EntidadSection
        titulo="Carreras"
        descripcion="Cada carrera agrupa sus materias."
        nuevoLabel="Nueva carrera"
        filas={carreras.data?.map((carrera) => ({
          id: carrera.id,
          titulo: carrera.nombre,
          descripcion: `Código ${carrera.codigo}`,
          activo: carrera.activa,
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) =>
          dialogo.abrirEdicion(carreras.data!.find((carrera) => carrera.id === id)!)
        }
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <CarreraFormDialog carrera={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
    </>
  );
}
