"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ComisionGestionDto } from "@repo/api/client";
import {
  crearComisionSchema,
  turnoLabels,
  turnoSchema,
  type CrearComision,
  type CrearComisionInput,
} from "@repo/domain";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useActualizarComision,
  useComisionesGestion,
  useCrearComision,
  useDarDeBajaComision,
  useDocentesAsignables,
  useMateriasGestion,
  usePeriodosGestion,
  useReactivarComision,
} from "@/hooks/use-datos-academicos";
import { showSaveError } from "@/lib/form-errors";

import {
  CampoEntidad,
  EntidadFormDialog,
  EntidadSection,
  useDialogoEntidad,
} from "./entidad-section";
import { GenerarClasesDialog } from "./generar-clases-dialog";

function SelectorDocentes({
  seleccionados,
  onChange,
}: {
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const docentes = useDocentesAsignables();
  const alternar = (id: string, marcado: boolean) =>
    onChange(marcado ? [...seleccionados, id] : seleccionados.filter((actual) => actual !== id));

  return (
    <Field>
      <FieldLabel>Docentes</FieldLabel>
      <div
        className="flex max-h-40 flex-col gap-2 overflow-y-auto"
        role="group"
        aria-label="Docentes"
      >
        {docentes.data?.map((docente) => (
          <Label key={docente.id} className="font-normal">
            <Checkbox
              checked={seleccionados.includes(docente.id)}
              onCheckedChange={(valor) => alternar(docente.id, valor === true)}
            />
            {docente.nombre}
          </Label>
        ))}
      </div>
      <FieldDescription>
        {docentes.data?.length === 0
          ? "No hay usuarios Docente disponibles."
          : "Podés dejar la comisión sin docentes y asignarlos después."}
      </FieldDescription>
    </Field>
  );
}

function ComisionFormDialog({
  comision,
  onClose,
}: {
  comision?: ComisionGestionDto;
  onClose: () => void;
}) {
  const materias = useMateriasGestion(false);
  const periodos = usePeriodosGestion(false);
  const crear = useCrearComision();
  const actualizar = useActualizarComision();
  const form = useForm<CrearComisionInput, unknown, CrearComision>({
    resolver: zodResolver(crearComisionSchema),
    defaultValues: {
      materiaId: comision?.materia.id ?? "",
      periodoLectivoId: comision?.periodoLectivo.id ?? "",
      codigo: comision?.codigo ?? "",
      turno: comision?.turno ?? "NOCHE",
      docenteIds: comision?.docentes.map((docente) => docente.id) ?? [],
    },
  });
  const errors = form.formState.errors;

  const guardar = async (values: CrearComision) => {
    try {
      if (comision) await actualizar.mutateAsync({ id: comision.id, input: values });
      else await crear.mutateAsync(values);
      toast.success(comision ? "Comisión actualizada" : "Comisión creada");
      onClose();
    } catch (error) {
      showSaveError(error, form.setError, "codigo");
    }
  };

  return (
    <EntidadFormDialog
      titulo={comision ? `Editar ${comision.codigo}` : "Nueva comisión"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="comision-materia" label="Materia" error={errors.materiaId?.message}>
        <NativeSelect id="comision-materia" className="w-full" {...form.register("materiaId")}>
          <NativeSelectOption value="">Elegí la materia</NativeSelectOption>
          {materias.data?.map((materia) => (
            <NativeSelectOption key={materia.id} value={materia.id}>
              {materia.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
      <CampoEntidad id="comision-periodo" label="Período" error={errors.periodoLectivoId?.message}>
        <NativeSelect
          id="comision-periodo"
          className="w-full"
          {...form.register("periodoLectivoId")}
        >
          <NativeSelectOption value="">Elegí el período</NativeSelectOption>
          {periodos.data?.map((periodo) => (
            <NativeSelectOption key={periodo.id} value={periodo.id}>
              {periodo.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CampoEntidad>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoEntidad id="comision-codigo" label="Código" error={errors.codigo?.message}>
          <Input id="comision-codigo" {...form.register("codigo")} />
        </CampoEntidad>
        <CampoEntidad id="comision-turno" label="Turno" error={errors.turno?.message}>
          <NativeSelect id="comision-turno" className="w-full" {...form.register("turno")}>
            {turnoSchema.options.map((turno) => (
              <NativeSelectOption key={turno} value={turno}>
                {turnoLabels[turno]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </CampoEntidad>
      </div>
      <SelectorDocentes
        seleccionados={form.watch("docenteIds") ?? []}
        onChange={(ids) => form.setValue("docenteIds", ids)}
      />
    </EntidadFormDialog>
  );
}

export function ComisionesTab() {
  const [bajas, setBajas] = useState(false);
  const comisiones = useComisionesGestion(bajas);
  const darDeBaja = useDarDeBajaComision();
  const reactivar = useReactivarComision();
  const dialogo = useDialogoEntidad<ComisionGestionDto>();
  const [generando, setGenerando] = useState<ComisionGestionDto | null>(null);

  return (
    <>
      <EntidadSection
        titulo="Comisiones"
        descripcion="Cada comisión se dicta en un período, con cero o más docentes."
        nuevoLabel="Nueva comisión"
        filas={comisiones.data?.map((comision) => ({
          id: comision.id,
          titulo: `${comision.codigo} · ${comision.materia.nombre}`,
          descripcion: `${comision.periodoLectivo.nombre} · ${turnoLabels[comision.turno]} · ${
            comision.docentes.length > 0
              ? comision.docentes.map((docente) => docente.nombre).join(", ")
              : "Sin docentes"
          }`,
          activo: comision.activa,
          acciones: [{ etiqueta: "Generar clases", onSelect: () => setGenerando(comision) }],
        }))}
        bajas={bajas}
        onBajasChange={setBajas}
        onNuevo={dialogo.abrirNuevo}
        onEditar={(id) =>
          dialogo.abrirEdicion(comisiones.data!.find((comision) => comision.id === id)!)
        }
        onDarDeBaja={darDeBaja.mutateAsync}
        onReactivar={reactivar.mutateAsync}
      />
      {dialogo.abierto ? (
        <ComisionFormDialog comision={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
      {generando ? (
        <GenerarClasesDialog
          nombre={generando.codigo}
          alcance={{ comisionId: generando.id }}
          onClose={() => setGenerando(null)}
        />
      ) : null}
    </>
  );
}
