"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { MateriaGestionDto } from "@repo/api/client";
import { crearMateriaSchema, type CrearMateria, type CrearMateriaInput } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarMateria,
  useCarrerasGestion,
  useCrearMateria,
  useDarDeBajaMateria,
  useMateriasGestion,
  useReactivarMateria,
} from "@/hooks/use-datos-academicos";
import { showSaveError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";

function MateriaFormDialog({
  materia,
  onClose,
}: {
  materia?: MateriaGestionDto;
  onClose: () => void;
}) {
  const carreras = useCarrerasGestion(false);
  const crear = useCrearMateria();
  const actualizar = useActualizarMateria();
  const form = useForm<CrearMateriaInput, unknown, CrearMateria>({
    resolver: zodResolver(crearMateriaSchema),
    defaultValues: {
      carreraId: materia?.carreraId ?? "",
      codigo: materia?.codigo ?? "",
      nombre: materia?.nombre ?? "",
      anioCarrera: materia?.anioCarrera ?? "",
    },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearMateria) => {
    try {
      if (materia) await actualizar.mutateAsync({ id: materia.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(materia ? "Materia actualizada" : "Materia creada");
      onClose();
    } catch (error) {
      showSaveError(error, form.setError, "codigo");
    }
  };

  return (
    <EntidadFormDialog
      titulo={materia ? `Editar ${materia.codigo}` : "Nueva materia"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="materia-carrera" label="Carrera" error={errors.carreraId?.message}>
        <NativeSelect id="materia-carrera" className="w-full" {...form.register("carreraId")}>
          <NativeSelectOption value="">Elegí la carrera</NativeSelectOption>
          {carreras.data?.map((carrera) => (
            <NativeSelectOption key={carrera.id} value={carrera.id}>
              {carrera.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
      <CampoEntidad id="materia-codigo" label="Código" error={errors.codigo?.message}>
        <Input id="materia-codigo" {...form.register("codigo")} />
      </CampoEntidad>
      <CampoEntidad id="materia-nombre" label="Nombre" error={errors.nombre?.message}>
        <Input id="materia-nombre" {...form.register("nombre")} />
      </CampoEntidad>
      <CampoEntidad id="materia-anio" label="Año de la carrera" error={errors.anioCarrera?.message}>
        <Input
          id="materia-anio"
          type="number"
          inputMode="numeric"
          min={1}
          max={6}
          {...form.register("anioCarrera")}
        />
      </CampoEntidad>
    </EntidadFormDialog>
  );
}

export function MateriasTab() {
  const [bajas, setBajas] = useState(false);
  const materias = useMateriasGestion(bajas);
  const darDeBaja = useDarDeBajaMateria();
  const reactivar = useReactivarMateria();
  const dialogo = useDialogoEntidad<MateriaGestionDto>();

  return (
    <>
      <EntidadSection
        titulo="Materias"
        descripcion="Cada materia pertenece a una carrera y a un año."
        nuevoLabel="Nueva materia"
        filas={materias.data?.map((materia) => ({
          id: materia.id,
          titulo: materia.nombre,
          descripcion: `${materia.codigo} · ${materia.carrera.nombre} · ${materia.anioCarrera}.º año`,
          activo: materia.activa,
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) =>
          dialogo.abrirEdicion(materias.data!.find((materia) => materia.id === id)!)
        }
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <MateriaFormDialog materia={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
    </>
  );
}
