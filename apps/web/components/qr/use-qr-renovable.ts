"use client";

import type { SesionQrDto } from "@repo/api/client";
import type { GenerarQrInput } from "@repo/domain";
import { useCallback, useEffect, useRef, useState } from "react";

import { useGenerarQr } from "@/hooks/use-qr";
import { RequestError } from "@/lib/api-client";

const tickMs = 250;

export type QrRenovable =
  | { estado: "cargando" }
  | { estado: "activo"; sesion: SesionQrDto; segundos: number }
  | { estado: "turno-terminado"; sesion: SesionQrDto }
  | { estado: "error"; mensaje: string };

type Codigo = { sesion: SesionQrDto; venceLocal: number } | null;

const mensajeDe = (error: unknown) =>
  error instanceof RequestError ? error.message : "No pudimos generar el QR. Probá de nuevo.";

// Pide un código al montar y otro cada vez que la cuenta llega a 0, mientras la pantalla
// siga abierta (RF-03). El vencimiento local se arma con la duración que informa el servidor,
// así un reloj desfasado del navegador no acorta ni alarga la vigencia.
export function useQrRenovable(consulta: GenerarQrInput): QrRenovable {
  const { mutateAsync: generar } = useGenerarQr();
  const [codigo, setCodigo] = useState<Codigo>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const renovando = useRef(false);
  // El intervalo lee el código vigente de acá: así no depende de cuándo React vuelva a renderizar.
  const vigenteRef = useRef<Codigo>(null);

  const pedirCodigo = useCallback(
    async (esVigente: () => boolean) => {
      renovando.current = true;
      try {
        const sesion = await generar(consulta);
        if (!esVigente()) return;
        const duracionMs =
          new Date(sesion.venceEn).getTime() - new Date(sesion.emitidoEn).getTime();
        vigenteRef.current = { sesion, venceLocal: Date.now() + duracionMs };
        setCodigo(vigenteRef.current);
        setSegundos(Math.ceil(duracionMs / 1000));
      } catch (cause) {
        if (!esVigente()) return;
        vigenteRef.current = null;
        setCodigo(null);
        setError(mensajeDe(cause));
      } finally {
        renovando.current = false;
      }
    },
    [generar, consulta],
  );

  useEffect(() => {
    if (error || terminado) return;
    let vigente = true;
    const tick = () => {
      if (renovando.current) return;
      const codigo = vigenteRef.current;
      if (!codigo) {
        void pedirCodigo(() => vigente);
        return;
      }
      const restanteMs = codigo.venceLocal - Date.now();
      if (restanteMs > 0) {
        setSegundos(Math.ceil(restanteMs / 1000));
        return;
      }
      // Un código que vence junto con el turno no se renueva: el turno terminó.
      if (new Date(codigo.sesion.venceEn) >= new Date(codigo.sesion.turnoFin)) {
        setTerminado(true);
        return;
      }
      void pedirCodigo(() => vigente);
    };
    const inicio = setTimeout(tick, 0);
    const timer = setInterval(tick, tickMs);
    return () => {
      vigente = false;
      clearTimeout(inicio);
      clearInterval(timer);
    };
  }, [error, terminado, pedirCodigo]);

  if (error) return { estado: "error", mensaje: error };
  if (!codigo) return { estado: "cargando" };
  if (terminado) return { estado: "turno-terminado", sesion: codigo.sesion };
  return { estado: "activo", sesion: codigo.sesion, segundos };
}
