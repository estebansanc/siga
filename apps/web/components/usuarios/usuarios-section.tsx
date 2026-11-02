"use client";

import type { UsuarioDto } from "@repo/api/client";
import { estadoUsuarioLabels, perfilLabels, perfilSchema, type EstadoUsuario } from "@repo/domain";
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
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { MoreHorizontalIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";

import { useDialogoEntidad } from "@/components/datos-academicos/entidad-section";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import {
  useDesactivarUsuario,
  useReactivarUsuario,
  useReenviarActivacion,
  useUsuarios,
} from "@/hooks/use-usuarios";
import { formatInstanteCorto } from "@/lib/dates";
import { showRequestError } from "@/lib/form-errors";

import { UsuarioFormDialog } from "./usuario-form-dialog";

const estadoVariants: Record<EstadoUsuario, "default" | "secondary" | "outline"> = {
  ACTIVO: "default",
  PENDIENTE: "secondary",
  DESACTIVADO: "outline",
};

function AccionesUsuario({
  usuario,
  onEditar,
  onReenviar,
  onDesactivar,
  onReactivar,
}: {
  usuario: UsuarioDto;
  onEditar: () => void;
  onReenviar: () => void;
  onDesactivar: () => void;
  onReactivar: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Acciones de ${usuario.nombre}`} />}
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onEditar}>Editar</DropdownMenuItem>
        {usuario.estado === "PENDIENTE" ? (
          <DropdownMenuItem onClick={onReenviar}>Reenviar enlace de activación</DropdownMenuItem>
        ) : null}
        {usuario.estado === "DESACTIVADO" ? (
          <DropdownMenuItem onClick={onReactivar}>Reactivar</DropdownMenuItem>
        ) : null}
        {usuario.estado !== "DESACTIVADO" && !usuario.esPropio && !usuario.esAdministrador ? (
          <DropdownMenuItem variant="destructive" onClick={onDesactivar}>
            Desactivar
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilaUsuario({
  usuario,
  acciones,
}: {
  usuario: UsuarioDto;
  acciones: Omit<Parameters<typeof AccionesUsuario>[0], "usuario">;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-48 whitespace-normal">
        <div className="font-medium">
          {usuario.nombre}
          {usuario.esAdministrador ? (
            <Badge variant="secondary" className="ml-2 align-middle">
              Administrador
            </Badge>
          ) : null}
          {usuario.esPropio ? (
            <span className="text-muted-foreground text-xs font-normal"> (vos)</span>
          ) : null}
        </div>
        <div className="text-muted-foreground truncate text-xs">{usuario.correo}</div>
        <div className="text-muted-foreground text-xs md:hidden">DNI {usuario.dni ?? "—"}</div>
      </TableCell>
      <TableCell className="hidden md:table-cell">{usuario.dni ?? "—"}</TableCell>
      <TableCell className="hidden lg:table-cell">{usuario.legajo ?? "—"}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-col items-start gap-1">
          <span>{perfilLabels[usuario.perfil]}</span>
          <Badge variant={estadoVariants[usuario.estado]}>
            {estadoUsuarioLabels[usuario.estado]}
          </Badge>
          {usuario.bajaSolicitada ? (
            <div className="flex flex-col items-start gap-0.5">
              <Badge variant="destructive">Baja solicitada</Badge>
              <span className="text-muted-foreground text-xs">
                {formatInstanteCorto(usuario.bajaSolicitada.solicitadaEn)}
                {usuario.bajaSolicitada.motivo ? ` · ${usuario.bajaSolicitada.motivo}` : ""}
              </span>
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="w-10">
        <AccionesUsuario usuario={usuario} {...acciones} />
      </TableCell>
    </TableRow>
  );
}

export function UsuariosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [perfil, setPerfil] = useState("");
  const [bajaSolicitada, setBajaSolicitada] = useState("");
  const q = useDeferredValue(busqueda.trim());
  const usuarios = useUsuarios({ q, perfil, bajaSolicitada });
  const dialogo = useDialogoEntidad<UsuarioDto>();
  const desactivar = useDesactivarUsuario();
  const reactivar = useReactivarUsuario();
  const reenviar = useReenviarActivacion();
  const [porDesactivar, setPorDesactivar] = useState<UsuarioDto | null>(null);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    try {
      await accion();
      toast.success(exito);
    } catch (error) {
      showRequestError(error);
    } finally {
      setPorDesactivar(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
        <CardDescription>
          Cuentas de la institución. Quien se da de alta recibe un enlace para definir su
          contraseña.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={dialogo.abrirNuevo}>
            <PlusIcon />
            Nuevo usuario
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            type="search"
            aria-label="Buscar usuarios"
            className="sm:basis-full lg:min-w-0 lg:flex-1 lg:basis-0"
            placeholder="Buscar por nombre, correo o DNI"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <NativeSelect
            aria-label="Filtrar por perfil"
            className="w-full sm:w-[11.5rem] sm:shrink-0"
            value={perfil}
            onChange={(event) => setPerfil(event.target.value)}
          >
            <NativeSelectOption value="">Todos los perfiles</NativeSelectOption>
            {perfilSchema.options.map((opcion) => (
              <NativeSelectOption key={opcion} value={opcion}>
                {perfilLabels[opcion]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filtrar por solicitud de baja"
            className="w-full sm:w-[10rem] sm:shrink-0"
            value={bajaSolicitada}
            onChange={(event) => setBajaSolicitada(event.target.value)}
          >
            <NativeSelectOption value="">Todas las cuentas</NativeSelectOption>
            <NativeSelectOption value="true">Baja solicitada</NativeSelectOption>
          </NativeSelect>
        </div>
        {!usuarios.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : usuarios.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No hay usuarios para mostrar</EmptyTitle>
              <EmptyDescription>Probá con otra búsqueda u otro perfil.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">DNI</TableHead>
                <TableHead className="hidden lg:table-cell">Legajo</TableHead>
                <TableHead>Perfil y estado</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.data.map((usuario) => (
                <FilaUsuario
                  key={usuario.id}
                  usuario={usuario}
                  acciones={{
                    onEditar: () => dialogo.abrirEdicion(usuario),
                    onReenviar: () =>
                      void ejecutar(
                        () => reenviar.mutateAsync(usuario.id),
                        `Enlace reenviado a ${usuario.correo}`,
                      ),
                    onDesactivar: () => setPorDesactivar(usuario),
                    onReactivar: () =>
                      void ejecutar(
                        () => reactivar.mutateAsync(usuario.id),
                        `Se reactivó a ${usuario.nombre}`,
                      ),
                  }}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {dialogo.abierto ? (
        <UsuarioFormDialog usuario={dialogo.item} onClose={dialogo.cerrar} />
      ) : null}
      {porDesactivar ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPorDesactivar(null)}
          title={`¿Desactivar a ${porDesactivar.nombre}?`}
          description="Pierde el acceso en cuanto navegue. Su historia se conserva y podés reactivarlo cuando quieras."
          confirmLabel="Desactivar"
          pending={desactivar.isPending}
          onConfirm={() =>
            void ejecutar(
              () => desactivar.mutateAsync(porDesactivar.id),
              `Se desactivó a ${porDesactivar.nombre}`,
            )
          }
        />
      ) : null}
    </Card>
  );
}
