"use client";

import { useEffect, useRef, useState } from "react";

export type EstadoCamara = "iniciando" | "activa" | "denegada" | "no-disponible";

type Detector = { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (opciones: { formats: string[] }) => Detector;

const intervaloLecturaMs = 250;

const wasmDelDecodificador = "/zxing_reader.wasm";
const erroresSeguidosMax = 5;

// Chrome y Android traen BarcodeDetector; Safari iOS no, y ahí entra el ponyfill (se descarga
// solo cuando hace falta). Su decodificador WASM se sirve desde la app (`public/`), no desde un
// CDN, para no depender de un tercero ni exponerle la IP del docente.
const crearDetector = async (): Promise<Detector> => {
  const nativo = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  if (nativo) return new nativo({ formats: ["qr_code"] });
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  await prepareZXingModule({
    overrides: {
      locateFile: (archivo: string, prefijo: string) =>
        archivo.endsWith(".wasm") ? wasmDelDecodificador : prefijo + archivo,
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: ["qr_code"] });
};

const estadoPorError = (error: unknown): EstadoCamara =>
  error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)
    ? "denegada"
    : "no-disponible";

// La cámara se abre al montar y sigue encendida mientras la pantalla esté abierta; `pausado`
// solo detiene la lectura (mientras se valida un código o se muestra un resultado).
export function useEscanerQr(alDetectar: (codigo: string) => void, pausado: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<EstadoCamara>("iniciando");
  const alDetectarRef = useRef(alDetectar);
  const pausadoRef = useRef(pausado);

  useEffect(() => {
    alDetectarRef.current = alDetectar;
    pausadoRef.current = pausado;
  });

  useEffect(() => {
    let activo = true;
    let flujo: MediaStream | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    let erroresSeguidos = 0;
    const leer = async (detector: Detector, video: HTMLVideoElement) => {
      if (!activo) return;
      if (!pausadoRef.current && video.readyState >= 2) {
        try {
          const [codigo] = await detector.detect(video);
          erroresSeguidos = 0;
          if (codigo && activo && !pausadoRef.current) alDetectarRef.current(codigo.rawValue);
        } catch {
          erroresSeguidos += 1;
          if (erroresSeguidos >= erroresSeguidosMax) {
            setEstado("no-disponible");
            return;
          }
        }
      }
      temporizador = setTimeout(() => void leer(detector, video), intervaloLecturaMs);
    };

    const iniciar = async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        const video = videoRef.current;
        if (!activo || !video) return;
        video.srcObject = flujo;
        await video.play().catch(() => undefined);
        const detector = await crearDetector();
        setEstado("activa");
        void leer(detector, video);
      } catch (error) {
        if (activo) setEstado(estadoPorError(error));
      }
    };
    void iniciar();

    return () => {
      activo = false;
      clearTimeout(temporizador);
      flujo?.getTracks().forEach((pista) => pista.stop());
    };
  }, []);

  return { videoRef, estado };
}
