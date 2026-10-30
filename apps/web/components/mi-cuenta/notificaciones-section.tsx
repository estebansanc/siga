"use client";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Spinner } from "@repo/ui/components/spinner";
import { Switch } from "@repo/ui/components/switch";
import { useState } from "react";
import { toast } from "sonner";

import { useActualizarPreferencias, usePreferencias } from "@/hooks/use-preferencias";
import { showRequestError } from "@/lib/form-errors";

type OpcionesDeCorreo = {
  notificarNovedadesPorCorreo: boolean;
  notificarAvisosPorCorreo: boolean;
};

// RF-14: quien no es estudiante recibe siempre por correo los avisos que lo alcanzan.
export function NotificacionesSection({ esEstudiante }: { esEstudiante: boolean }) {
  return esEstudiante ? <OpcionesDeCorreoCard /> : <NotificacionesInformativas />;
}

function NotificacionesInformativas() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones por correo</CardTitle>
        <CardDescription>
          Recibís siempre por correo los avisos que te alcanzan. No hay nada que configurar.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function OpcionesDeCorreoCard() {
  const preferencias = usePreferencias();
  const actualizar = useActualizarPreferencias();
  const [editadas, setEditadas] = useState<OpcionesDeCorreo | null>(null);
  const opciones: OpcionesDeCorreo | null = preferencias.data
    ? (editadas ?? {
        notificarNovedadesPorCorreo: preferencias.data.notificarNovedadesPorCorreo,
        notificarAvisosPorCorreo: preferencias.data.notificarAvisosPorCorreo,
      })
    : null;

  const hayCambios =
    editadas !== null &&
    (editadas.notificarNovedadesPorCorreo !== preferencias.data?.notificarNovedadesPorCorreo ||
      editadas.notificarAvisosPorCorreo !== preferencias.data?.notificarAvisosPorCorreo);

  const cambiarOpcion = (opcion: keyof OpcionesDeCorreo, activada: boolean) => {
    if (opciones) setEditadas({ ...opciones, [opcion]: activada });
  };

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({ ...opciones });
      setEditadas(null);
      toast.success("Notificaciones guardadas");
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones por correo</CardTitle>
          <CardDescription>
            Elegí qué correos querés recibir. Por defecto están desactivados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch
                id="pref-correo-novedades"
                disabled={!opciones}
                checked={opciones?.notificarNovedadesPorCorreo ?? false}
                onCheckedChange={(activada) =>
                  cambiarOpcion("notificarNovedadesPorCorreo", activada)
                }
              />
              <FieldLabel htmlFor="pref-correo-novedades">Recibir novedades por correo</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="pref-correo-avisos"
                disabled={!opciones}
                checked={opciones?.notificarAvisosPorCorreo ?? false}
                onCheckedChange={(activada) => cambiarOpcion("notificarAvisosPorCorreo", activada)}
              />
              <FieldLabel htmlFor="pref-correo-avisos">
                Recibir avisos institucionales por correo
              </FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={!hayCambios || actualizar.isPending} onClick={() => void guardar()}>
          {actualizar.isPending ? <Spinner /> : null}
          Guardar
        </Button>
      </div>
    </div>
  );
}
