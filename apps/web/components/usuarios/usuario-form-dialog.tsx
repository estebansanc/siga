"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UsuarioDto } from "@repo/api/client";
import {
  crearUsuarioSchema,
  edicionUsuarioFormSchema,
  perfilLabels,
  perfilSchema,
  type CrearUsuario,
  type CrearUsuarioInput,
} from "@repo/domain";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CampoEntidad, EntidadFormDialog } from "@/components/datos-academicos/entidad-section";
import { useComisiones } from "@/hooks/use-datos-academicos";
import { useActualizarUsuario, useCrearUsuario } from "@/hooks/use-usuarios";
import { showRequestError } from "@/lib/form-errors";

function SelectorComisiones({
  seleccionadas,
  onChange,
}: {
  seleccionadas: string[];
  onChange: (ids: string[]) => void;
}) {
  const comisiones = useComisiones({});
  const alternar = (id: string, marcada: boolean) =>
    onChange(marcada ? [...seleccionadas, id] : seleccionadas.filter((actual) => actual !== id));

  return (
    <Field>
      <FieldLabel>Comisiones</FieldLabel>
      <div
        className="flex max-h-40 flex-col gap-2 overflow-y-auto"
        role="group"
        aria-label="Comisiones"
      >
        {comisiones.data?.map((comision) => (
          <Label key={comision.id} className="font-normal">
            <Checkbox
              checked={seleccionadas.includes(comision.id)}
              onCheckedChange={(valor) => alternar(comision.id, valor === true)}
            />
            {comision.codigo} · {comision.materia.nombre}
          </Label>
        ))}
      </div>
      <FieldDescription>
        {comisiones.data?.length === 0
          ? "Todavía no hay comisiones cargadas."
          : "Las comisiones que dicta; se pueden cambiar después."}
      </FieldDescription>
    </Field>
  );
}

// Alta y edición con el mismo formulario; el correo identifica la cuenta y solo se carga al
// alta, y nadie cambia su propio perfil.
export function UsuarioFormDialog({
  usuario,
  onClose,
}: {
  usuario?: UsuarioDto;
  onClose: () => void;
}) {
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const form = useForm<CrearUsuarioInput, unknown, CrearUsuario>({
    resolver: usuario ? zodResolver(edicionUsuarioFormSchema) : zodResolver(crearUsuarioSchema),
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      dni: usuario?.dni ?? "",
      correo: usuario?.correo ?? "",
      legajo: usuario?.legajo ?? "",
      perfil: usuario?.perfil ?? "ESTUDIANTE",
      comisionIds: usuario?.comisiones.map((comision) => comision.id) ?? [],
    },
  });
  const errors = form.formState.errors;
  const perfil = form.watch("perfil");

  const guardar = async (values: CrearUsuario) => {
    if (usuario?.dni && !values.dni) {
      form.setError("dni", { message: "El DNI no se puede dejar vacío" });
      return;
    }
    try {
      if (usuario) {
        await actualizar.mutateAsync({
          id: usuario.id,
          input: {
            nombre: values.nombre,
            dni: values.dni || undefined,
            legajo: values.legajo ?? null,
            perfil: values.perfil,
            comisionIds: values.perfil === "DOCENTE" ? values.comisionIds : [],
          },
        });
      } else {
        await crear.mutateAsync(values);
      }
      toast.success(usuario ? "Usuario actualizado" : "Usuario creado: le enviamos el enlace");
      onClose();
    } catch (error) {
      showRequestError(error, form.setError);
    }
  };

  return (
    <EntidadFormDialog
      titulo={usuario ? `Editar ${usuario.nombre}` : "Nuevo usuario"}
      guardando={crear.isPending || actualizar.isPending}
      onClose={onClose}
      onSubmit={form.handleSubmit(guardar)}
    >
      <CampoEntidad id="usuario-nombre" label="Apellido y nombre" error={errors.nombre?.message}>
        <Input id="usuario-nombre" autoComplete="off" {...form.register("nombre")} />
      </CampoEntidad>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoEntidad id="usuario-dni" label="DNI" error={errors.dni?.message}>
          <Input id="usuario-dni" inputMode="numeric" {...form.register("dni")} />
        </CampoEntidad>
        <CampoEntidad id="usuario-legajo" label="Legajo (opcional)" error={errors.legajo?.message}>
          <Input id="usuario-legajo" {...form.register("legajo")} />
        </CampoEntidad>
      </div>
      <CampoEntidad id="usuario-correo" label="Correo" error={errors.correo?.message}>
        <Input
          id="usuario-correo"
          type="email"
          disabled={Boolean(usuario)}
          {...form.register("correo")}
        />
      </CampoEntidad>
      <CampoEntidad id="usuario-perfil" label="Perfil" error={errors.perfil?.message}>
        <NativeSelect
          id="usuario-perfil"
          className="w-full"
          disabled={usuario?.esPropio}
          {...form.register("perfil")}
        >
          {perfilSchema.options.map((opcion) => (
            <NativeSelectOption key={opcion} value={opcion}>
              {perfilLabels[opcion]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {usuario?.esPropio ? (
          <FieldDescription>No podés cambiar tu propio perfil.</FieldDescription>
        ) : null}
      </CampoEntidad>
      {perfil === "DOCENTE" ? (
        <SelectorComisiones
          seleccionadas={form.watch("comisionIds") ?? []}
          onChange={(ids) => form.setValue("comisionIds", ids)}
        />
      ) : null}
    </EntidadFormDialog>
  );
}
