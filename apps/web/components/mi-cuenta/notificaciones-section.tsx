"use client";

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

const mensajeDeOpcion = (opcion: keyof OpcionesDeCorreo, activada: boolean) => {
  const verbo = activada ? "Vas a recibir" : "Ya no vas a recibir";
  const que =
    opcion === "notificarNovedadesPorCorreo"
      ? "novedades por correo"
      : "avisos institucionales por correo";
  return `${verbo} ${que}`;
};

function OpcionesDeCorreoCard() {
  const preferencias = usePreferencias();
  const actualizar = useActualizarPreferencias();
  const [enCurso, setEnCurso] = useState<keyof OpcionesDeCorreo | null>(null);
  const opciones: OpcionesDeCorreo | null = preferencias.data
    ? {
        notificarNovedadesPorCorreo: preferencias.data.notificarNovedadesPorCorreo,
        notificarAvisosPorCorreo: preferencias.data.notificarAvisosPorCorreo,
      }
    : null;
  const deshabilitado = !opciones || actualizar.isPending || enCurso !== null;

  const cambiarOpcion = async (opcion: keyof OpcionesDeCorreo, activada: boolean) => {
    setEnCurso(opcion);
    try {
      await actualizar.mutateAsync({ [opcion]: activada });
      toast.success(mensajeDeOpcion(opcion, activada));
    } catch (error) {
      showRequestError(error);
    } finally {
      setEnCurso(null);
    }
  };

  return (
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
              disabled={deshabilitado}
              checked={opciones?.notificarNovedadesPorCorreo ?? false}
              onCheckedChange={(activada) =>
                void cambiarOpcion("notificarNovedadesPorCorreo", activada)
              }
            />
            <FieldLabel htmlFor="pref-correo-novedades">Recibir novedades por correo</FieldLabel>
            {enCurso === "notificarNovedadesPorCorreo" ? <Spinner /> : null}
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="pref-correo-avisos"
              disabled={deshabilitado}
              checked={opciones?.notificarAvisosPorCorreo ?? false}
              onCheckedChange={(activada) =>
                void cambiarOpcion("notificarAvisosPorCorreo", activada)
              }
            />
            <FieldLabel htmlFor="pref-correo-avisos">
              Recibir avisos institucionales por correo
            </FieldLabel>
            {enCurso === "notificarAvisosPorCorreo" ? <Spinner /> : null}
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
