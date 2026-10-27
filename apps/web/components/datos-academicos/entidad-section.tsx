"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { InboxIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { useState, type FormEventHandler, type ReactNode } from "react";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { showRequestError } from "@/lib/form-errors";

export type FilaEntidad = {
  id: string;
  titulo: string;
  descripcion: string;
  activo: boolean;
  acciones?: { etiqueta: string; onSelect: () => void }[];
};

type Props = {
  titulo: string;
  descripcion: string;
  nuevoLabel: string;
  filas: FilaEntidad[] | undefined;
  bajas: boolean;
  onBajasChange: (bajas: boolean) => void;
  onNuevo: () => void;
  onEditar: (id: string) => void;
  onDarDeBaja: (id: string) => Promise<unknown>;
  onReactivar: (id: string) => Promise<unknown>;
};

function FilaItem({
  fila,
  onEditar,
  onDarDeBaja,
  onReactivar,
}: {
  fila: FilaEntidad;
  onEditar: () => void;
  onDarDeBaja: () => void;
  onReactivar: () => void;
}) {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {fila.titulo}
          {fila.activo ? null : <Badge variant="outline">De baja</Badge>}
        </ItemTitle>
        <ItemDescription>{fila.descripcion}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Acciones de ${fila.titulo}`} />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {fila.activo ? (
              <>
                <DropdownMenuItem onClick={onEditar}>Editar</DropdownMenuItem>
                {fila.acciones?.map((accion) => (
                  <DropdownMenuItem key={accion.etiqueta} onClick={accion.onSelect}>
                    {accion.etiqueta}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={onDarDeBaja}>Dar de baja</DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={onReactivar}>Reactivar</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}

// Listado con alta, edición, baja lógica y reactivación; cada pestaña de Datos académicos lo usa.
export function EntidadSection({
  titulo,
  descripcion,
  nuevoLabel,
  filas,
  bajas,
  onBajasChange,
  onNuevo,
  onEditar,
  onDarDeBaja,
  onReactivar,
}: Props) {
  const [porDarDeBaja, setPorDarDeBaja] = useState<FilaEntidad | null>(null);
  const [procesando, setProcesando] = useState(false);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setProcesando(true);
    try {
      await accion();
      toast.success(exito);
      setPorDarDeBaja(null);
    } catch (error) {
      setPorDarDeBaja(null);
      showRequestError(error);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
        <CardAction>
          <Button size="sm" onClick={onNuevo}>
            <PlusIcon />
            {nuevoLabel}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          variant="outline"
          value={[bajas ? "bajas" : "activas"]}
          onValueChange={(value: string[]) =>
            value.length > 0 && onBajasChange(value.at(-1) === "bajas")
          }
          aria-label={`${titulo} a mostrar`}
        >
          <ToggleGroupItem value="activas">Activos</ToggleGroupItem>
          <ToggleGroupItem value="bajas">De baja</ToggleGroupItem>
        </ToggleGroup>
        {!filas ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>{bajas ? "Nada dado de baja" : "Todavía no hay nada cargado"}</EmptyTitle>
              <EmptyDescription>
                {bajas
                  ? "Lo que des de baja aparece acá."
                  : `Usá «${nuevoLabel}» para cargar el primero.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {filas.map((fila) => (
              <FilaItem
                key={fila.id}
                fila={fila}
                onEditar={() => onEditar(fila.id)}
                onDarDeBaja={() => setPorDarDeBaja(fila)}
                onReactivar={() =>
                  void ejecutar(() => onReactivar(fila.id), `Se reactivó ${fila.titulo}`)
                }
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {porDarDeBaja ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPorDarDeBaja(null)}
          title={`¿Dar de baja ${porDarDeBaja.titulo}?`}
          description="Deja de ofrecerse. El código sigue ocupado y se puede reactivar desde «De baja»."
          confirmLabel="Dar de baja"
          pending={procesando}
          onConfirm={() =>
            void ejecutar(
              () => onDarDeBaja(porDarDeBaja.id),
              `Se dio de baja ${porDarDeBaja.titulo}`,
            )
          }
        />
      ) : null}
    </Card>
  );
}

export function EntidadFormDialog({
  titulo,
  guardando,
  onClose,
  onSubmit,
  children,
}: {
  titulo: string;
  guardando: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && !guardando && onClose()}>
      <FormDialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Los cambios quedan en auditoría.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={guardando} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}

// Estado de "nuevo" o "editar X" de una pestaña.
export function useDialogoEntidad<T>() {
  const [estado, setEstado] = useState<{ item?: T } | null>(null);
  return {
    abierto: estado !== null,
    item: estado?.item,
    abrirNuevo: () => setEstado({}),
    abrirEdicion: (item: T) => setEstado({ item }),
    cerrar: () => setEstado(null),
  };
}

export function CampoEntidad({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
