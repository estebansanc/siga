"use client";

import { useEffect, useRef, useState } from "react";

export type EstadoCamara = "iniciando" | "activa" | "denegada" | "no-disponible";

type Detector = { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (opciones: { formats: string[] }) => Detector;

const intervaloLecturaMs = 250;

// Chrome y Android traen BarcodeDetector; Safari iOS no, y ahí entra el ponyfill (se descarga
// solo cuando hace falta).
const crearDetector = async (): Promise<Detector> => {
  const nativo = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  if (nativo) return new nativo({ formats: ["qr_code"] });
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
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

    const leer = async (detector: Detector, video: HTMLVideoElement) => {
      if (!activo) return;
      if (!pausadoRef.current && video.readyState >= 2) {
        const [codigo] = await detector.detect(video).catch(() => []);
        if (codigo && activo && !pausadoRef.current) alDetectarRef.current(codigo.rawValue);
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
