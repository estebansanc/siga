"use client";

import type { GenerarQrInput } from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { MaximizeIcon } from "lucide-react";
import { useState } from "react";

import { ClasesDelTurno } from "./clases-del-turno";
import { QrCodigo } from "./qr-codigo";
import { useQrRenovable } from "./use-qr-renovable";

// Con la pantalla abierta el código se renueva solo; si falla una renovación (institución
// cerrada, turno terminado) el QR se oculta con el motivo.
export function QrEnVivo({ consulta }: { consulta: GenerarQrInput }) {
  const qr = useQrRenovable(consulta);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardContent className="flex flex-col items-center gap-4">
          {qr.estado === "cargando" ? <Skeleton className="size-72" /> : null}
          {qr.estado === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo generar el QR</AlertTitle>
              <AlertDescription>{qr.mensaje}</AlertDescription>
            </Alert>
          ) : null}
          {qr.estado === "turno-terminado" ? (
            <Alert>
              <AlertTitle>El turno terminó</AlertTitle>
              <AlertDescription>
                El código dejó de valer. Generá uno nuevo para otro turno.
              </AlertDescription>
            </Alert>
          ) : null}
          {qr.estado === "activo" ? (
            <>
              <QrCodigo sesion={qr.sesion} segundos={qr.segundos} />
              <Button variant="outline" onClick={() => setPantallaCompleta(true)}>
                <MaximizeIcon />
                Pantalla completa
              </Button>
              <Dialog open={pantallaCompleta} onOpenChange={setPantallaCompleta}>
                <DialogContent
                  className="flex h-dvh max-h-none w-screen max-w-none items-center justify-center rounded-none bg-white p-6 text-black sm:max-w-none"
                  data-slot="qr-pantalla-completa"
                >
                  <DialogTitle className="sr-only">
                    QR de asistencia en pantalla completa
                  </DialogTitle>
                  <QrCodigo sesion={qr.sesion} segundos={qr.segundos} grande />
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </CardContent>
      </Card>
      <ClasesDelTurno consulta={consulta} />
    </div>
  );
}
