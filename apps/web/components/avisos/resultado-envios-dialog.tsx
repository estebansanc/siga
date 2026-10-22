"use client";

import type { NotificacionAvisoDto } from "@repo/api/client";
import type { EmailStatus } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";

import { tonoClassNames, type Tono } from "@/components/estado-tonos";
import { useNotificacionesAviso } from "@/hooks/use-avisos";

const estadoEnvio: Record<EmailStatus, { label: string; tono: Tono }> = {
  SENT: { label: "Enviado", tono: "verde" },
  PENDING: { label: "Pendiente", tono: "amarillo" },
  FAILED: { label: "Fallido", tono: "rojo" },
};

function EnvioItem({ notificacion }: { notificacion: NotificacionAvisoDto }) {
  const { label, tono } = estadoEnvio[notificacion.estado];
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{notificacion.destinatario.nombre}</ItemTitle>
        <ItemDescription>{notificacion.destinatario.email}</ItemDescription>
      </ItemContent>
      <Badge variant="outline" className={cn(tonoClassNames[tono])}>
        {label}
      </Badge>
    </Item>
  );
}

export function ResultadoEnviosDialog({
  avisoId,
  titulo,
  onClose,
}: {
  avisoId: string;
  titulo: string;
  onClose: () => void;
}) {
  const notificaciones = useNotificacionesAviso(avisoId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resultado de envíos</DialogTitle>
          <DialogDescription>Correos del aviso “{titulo}”, uno por destinatario.</DialogDescription>
        </DialogHeader>
        {!notificaciones.data ? (
          <Skeleton className="h-20 w-full" />
        ) : notificaciones.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ningún destinatario recibe este aviso por correo.
          </p>
        ) : (
          <ItemGroup className="gap-2">
            {notificaciones.data.map((notificacion) => (
              <EnvioItem key={notificacion.id} notificacion={notificacion} />
            ))}
          </ItemGroup>
        )}
      </DialogContent>
    </Dialog>
  );
}
