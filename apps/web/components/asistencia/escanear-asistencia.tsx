"use client";

import type { RegistroQrResultadoDto } from "@repo/api/client";
import { metodoAsistenciaLabels, turnoLabels } from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { AspectRatio } from "@repo/ui/components/aspect-ratio";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { CircleCheckIcon } from "lucide-react";
import { useState } from "react";

import { useRegistrarAsistenciaQr } from "@/hooks/use-asistencias";
import { RequestError } from "@/lib/api-client";
import { textoRegistroManual, textoSinCamara, tituloSinCamara } from "@/lib/asistencia-sin-camara";
import { leerUbicacion } from "@/lib/ubicacion";

import { useEscanerQr } from "./use-escaner-qr";

type Fase =
  | { tipo: "escaneando" }
  | { tipo: "validando" }
  | { tipo: "registrada"; resultado: RegistroQrResultadoDto }
  | { tipo: "error"; mensaje: string }
  | { tipo: "bloqueada"; mensaje: string };

const codigoDeBloqueo = "ATTEMPTS_BLOCKED";

const faseDeError = (error: unknown): Fase => {
  if (error instanceof RequestError) {
    return error.code === codigoDeBloqueo
      ? { tipo: "bloqueada", mensaje: error.message }
      : { tipo: "error", mensaje: error.message };
  }
  return { tipo: "error", mensaje: "No pudimos validar el código. Volvé a escanear." };
};

export function EscanearAsistencia() {
  const registrar = useRegistrarAsistenciaQr();
  const [fase, setFase] = useState<Fase>({ tipo: "escaneando" });

  const validar = async (token: string) => {
    setFase({ tipo: "validando" });
    try {
      const ubicacion = await leerUbicacion();
      const resultado = await registrar.mutateAsync({ token, ubicacion });
      setFase({ tipo: "registrada", resultado });
    } catch (error) {
      setFase(faseDeError(error));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      {fase.tipo === "registrada" ? <AsistenciaRegistrada resultado={fase.resultado} /> : null}
      {fase.tipo === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>No se registró la asistencia</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{fase.mensaje}</span>
            <Button variant="outline" onClick={() => setFase({ tipo: "escaneando" })}>
              Volver a escanear
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {fase.tipo === "bloqueada" ? (
        <Alert variant="destructive">
          <AlertTitle>Escaneo bloqueado</AlertTitle>
          <AlertDescription>{fase.mensaje}</AlertDescription>
        </Alert>
      ) : null}
      {fase.tipo === "registrada" || fase.tipo === "bloqueada" ? null : (
        <CamaraEscaner
          pausada={fase.tipo !== "escaneando"}
          validando={fase.tipo === "validando"}
          alDetectar={(token) => void validar(token)}
        />
      )}
    </div>
  );
}

// La cámara vive solo mientras se puede escanear: al registrar o bloquearse, el componente se
// desmonta y se apaga.
function CamaraEscaner({
  pausada,
  validando,
  alDetectar,
}: {
  pausada: boolean;
  validando: boolean;
  alDetectar: (token: string) => void;
}) {
  const { videoRef, estado, reintentar } = useEscanerQr(alDetectar, pausada);

  return (
    <>
      {estado === "denegada" ? <CamaraDenegada alReintentar={reintentar} /> : null}
      {estado === "no-disponible" ? <CamaraNoDisponible alReintentar={reintentar} /> : null}
      <Card className={estado === "denegada" || estado === "no-disponible" ? "hidden" : undefined}>
        <CardHeader>
          <CardTitle>Escaneá el QR del aula</CardTitle>
          <CardDescription>
            Apuntá la cámara al código que muestra bedelía al llegar al aula.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AspectRatio ratio={1} className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} muted playsInline className="size-full object-cover" />
            {validando || estado === "iniciando" ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-white">
                <Spinner />
                {validando ? "Validando…" : "Abriendo la cámara…"}
              </div>
            ) : null}
          </AspectRatio>
        </CardContent>
      </Card>
    </>
  );
}

function AsistenciaRegistrada({ resultado }: { resultado: RegistroQrResultadoDto }) {
  const { asistencia, aula, turno, yaRegistrada } = resultado;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleCheckIcon className="text-primary size-5" />
          {yaRegistrada ? "La asistencia ya estaba registrada" : "Asistencia registrada"}
        </CardTitle>
        <CardDescription>
          {aula.codigo} · Turno {turnoLabels[turno]} · {asistencia.horaLlegada}
        </CardDescription>
      </CardHeader>
      {yaRegistrada ? (
        <CardContent className="text-muted-foreground text-sm">
          {metodoAsistenciaLabels[asistencia.metodo]} a las {asistencia.horaLlegada}. No se duplicó
          el registro.
        </CardContent>
      ) : null}
    </Card>
  );
}

function CamaraDenegada({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Alert>
      <AlertTitle>La cámara está bloqueada</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>
          Para escanear el QR, permití el acceso a la cámara: tocá el candado o el ícono de ajustes
          junto a la dirección del sitio y elegí Cámara &gt; Permitir.
        </span>
        <span>{textoRegistroManual}</span>
        <Button variant="outline" onClick={alReintentar}>
          Volver a intentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function CamaraNoDisponible({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Alert>
      <AlertTitle>{tituloSinCamara}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{textoSinCamara}</span>
        <span>{textoRegistroManual}</span>
        <Button variant="outline" onClick={alReintentar}>
          Volver a intentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
