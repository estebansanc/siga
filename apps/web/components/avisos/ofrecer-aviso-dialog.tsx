"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { useRouter } from "next/navigation";

import { queryDeAvisoDesdeEstado, type CambioDeEstado } from "@/lib/aviso-precargado";

// Tras cerrar la institución o abrirla con novedades se ofrece el aviso ya redactado: se abre
// precargado en Avisos y no se publica hasta que el bedel lo confirme.
export function OfrecerAvisoDialog({
  cambio,
  onClose,
}: {
  cambio: CambioDeEstado;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Generar un aviso institucional?</AlertDialogTitle>
          <AlertDialogDescription>
            Se abre un aviso urgente para todos con el motivo del cambio. Podés revisarlo antes de
            publicarlo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ahora no</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              router.push(`/avisos?${new URLSearchParams(queryDeAvisoDesdeEstado(cambio))}`)
            }
          >
            Generar aviso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
