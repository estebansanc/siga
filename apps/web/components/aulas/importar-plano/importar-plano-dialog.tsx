"use client";

import type { PlanoPisoDto } from "@repo/api/client";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { AlertCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FormDialogContent } from "@/components/form-dialog-content";
import { useAulas } from "@/hooks/use-aulas";
import { useImportarAulas } from "@/hooks/use-planos";
import { RequestError } from "@/lib/api-client";

import { aulaDesdeDeteccion, evaluarNombres, type AulaEditable } from "./aulas-editables";
import { PasoDeteccion } from "./paso-deteccion";
import { PasoNombres } from "./paso-nombres";
import { PasoPlano, type ResultadoPaso1 } from "./paso-plano";
import { PasoVistaPrevia } from "./paso-vista-previa";

const titulosDePaso = ["Plano", "Detección", "Nombres", "Vista previa"] as const;

const mensajeDeCarga = (cantidad: number) =>
  cantidad === 1 ? "Se cargó 1 aula" : `Se cargaron ${cantidad} aulas`;

// Asistente de cuatro pasos (RF-02): el plano se guarda y se analiza al salir del primero; nada
// se crea hasta Confirmar.
export function ImportarPlanoDialog({ onClose }: { onClose: () => void }) {
  const [paso, setPaso] = useState(0);
  const [plano, setPlano] = useState<PlanoPisoDto | null>(null);
  const [aulas, setAulas] = useState<AulaEditable[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [capacidadPorDefecto, setCapacidadPorDefecto] = useState("");
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const activas = useAulas(false);
  const dadasDeBaja = useAulas(true);
  const importar = useImportarAulas(plano?.id ?? "");
  const existentes = [...(activas.data ?? []), ...(dadasDeBaja.data ?? [])];
  const tildadas = aulas.filter((aula) => aula.tildada);

  const alTenerPlano = ({ plano, deteccion, aviso }: ResultadoPaso1) => {
    setPlano(plano);
    setAulas(deteccion.aulas.map(aulaDesdeDeteccion));
    setAviso(aviso);
    setPaso(1);
  };

  const ubicadas = plano
    ? [...evaluarNombres(tildadas, existentes, plano).values()].filter((e) => e.ubicara).length
    : 0;

  const confirmar = async () => {
    if (!plano) return;
    setErrorImportacion(null);
    try {
      const resultado = await importar.mutateAsync({
        capacidadPorDefecto: Number(capacidadPorDefecto),
        aulas: tildadas.map((aula) => ({
          codigo: aula.nombre.trim(),
          poligono: aula.poligono,
          ...(aula.capacidad.trim() ? { capacidad: Number(aula.capacidad) } : {}),
        })),
      });
      toast.success(mensajeDeCarga(resultado.creadas.length + resultado.ubicadas.length));
      onClose();
    } catch (error) {
      setErrorImportacion(
        error instanceof RequestError ? error.message : "Ocurrió un error inesperado",
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !importar.isPending && onClose()}>
      <FormDialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>Importar desde plano</DialogTitle>
          <DialogDescription>
            Paso {paso + 1} de {titulosDePaso.length}: {titulosDePaso[paso]}
          </DialogDescription>
        </DialogHeader>
        {paso === 0 ? <PasoPlano onCancelar={onClose} onListo={alTenerPlano} /> : null}
        {paso === 1 && plano ? (
          <PasoDeteccion
            plano={plano}
            aulas={aulas}
            aviso={aviso}
            onCambiar={setAulas}
            onContinuar={() => setPaso(2)}
            onCancelar={onClose}
          />
        ) : null}
        {paso === 2 && plano ? (
          <PasoNombres
            plano={plano}
            aulas={aulas}
            existentes={existentes}
            capacidadPorDefecto={capacidadPorDefecto}
            onCapacidadPorDefecto={setCapacidadPorDefecto}
            onCambiar={setAulas}
            onVolver={() => setPaso(1)}
            onContinuar={() => setPaso(3)}
          />
        ) : null}
        {paso === 3 && plano ? (
          <>
            {errorImportacion ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{errorImportacion}</AlertDescription>
              </Alert>
            ) : null}
            <PasoVistaPrevia
              plano={plano}
              aulas={tildadas}
              nuevas={tildadas.length - ubicadas}
              ubicadas={ubicadas}
              confirmando={importar.isPending}
              onVolver={() => setPaso(2)}
              onConfirmar={() => void confirmar()}
            />
          </>
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}
