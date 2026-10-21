"use client";

import type { SesionQrDto } from "@repo/api/client";
import { turnoLabels } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { QRCodeSVG } from "qrcode.react";

import { describirAula } from "@/components/clases/clase-card";

// Fondo blanco fijo: el código oscuro se lee igual en el tema oscuro.
export function QrCodigo({
  sesion,
  segundos,
  grande = false,
}: {
  sesion: SesionQrDto;
  segundos: number;
  grande?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <div className="rounded-xl bg-white p-4" data-slot="qr-codigo">
        <QRCodeSVG
          value={sesion.token}
          level="M"
          size={512}
          marginSize={0}
          title={`QR de asistencia de ${sesion.aula.codigo}`}
          className={cn(
            "h-auto w-full",
            grande ? "max-w-[min(70vh,70vw)]" : "max-w-72 sm:max-w-80",
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <p className={cn("font-heading font-semibold", grande ? "text-5xl" : "text-xl")}>
          {sesion.aula.codigo}
        </p>
        {grande ? null : (
          <p className="text-muted-foreground text-sm">{describirAula(sesion.aula)}</p>
        )}
        <p className={cn(grande ? "text-3xl" : "text-base")}>Turno {turnoLabels[sesion.turno]}</p>
      </div>
      <p
        className={cn("tabular-nums", grande ? "text-4xl" : "text-lg")}
        role="timer"
        aria-label="Segundos para que cambie el código"
      >
        Cambia en {segundos} s
      </p>
    </div>
  );
}
