"use client";

import type { PlanoPisoDto } from "@repo/api/client";
import {
  archivoPlanoTipos,
  esArchivoPlanoValido,
  mensajeArchivoPlanoInvalido,
  type DeteccionAulas,
} from "@repo/domain";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { DialogFooter } from "@repo/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Spinner } from "@repo/ui/components/spinner";
import { AlertCircleIcon, InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useAulas } from "@/hooks/use-aulas";
import { useDetectarAulas, useGuardarPlano, usePlanos } from "@/hooks/use-planos";
import { RequestError } from "@/lib/api-client";
import { contarPaginasDelPdf, esPdf } from "@/lib/archivo-plano";

import { CampoConSugerencias } from "./campo-con-sugerencias";

export const mensajeSinAlmacenamiento =
  "No se puede importar desde plano: el almacenamiento de archivos no está configurado.";

export type ResultadoPaso1 = {
  plano: PlanoPisoDto;
  deteccion: DeteccionAulas;
  aviso: string | null;
};

const avisoDeDeteccion = (error: unknown) =>
  error instanceof RequestError && error.status === 503
    ? "La detección automática no está configurada. Dibujá las aulas a mano."
    : "No se pudo detectar las aulas automáticamente. Dibujalas a mano.";

const unicos = (valores: string[]) =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, "es"));

export function PasoPlano({
  onCancelar,
  onListo,
}: {
  onCancelar: () => void;
  onListo: (resultado: ResultadoPaso1) => void;
}) {
  const planos = usePlanos();
  const aulas = useAulas(false);
  const guardar = useGuardarPlano();
  const detectar = useDetectarAulas();
  const [edificio, setEdificio] = useState("");
  const [piso, setPiso] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [paginas, setPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const procesando = guardar.isPending || detectar.isPending;

  const ubicaciones = useMemo(
    () => [
      ...(planos.data ?? []).map(({ edificio, piso }) => ({ edificio, piso })),
      ...(aulas.data ?? []).map(({ edificio, piso }) => ({ edificio, piso })),
    ],
    [planos.data, aulas.data],
  );
  const edificios = unicos(ubicaciones.map((ubicacion) => ubicacion.edificio));
  const pisos = unicos(
    ubicaciones.filter((ubicacion) => ubicacion.edificio === edificio.trim()).map((u) => u.piso),
  );
  const reemplaza = (planos.data ?? []).some(
    (plano) => plano.edificio === edificio.trim() && plano.piso === piso.trim(),
  );

  const elegirArchivo = async (elegido: File | undefined) => {
    setErrorGeneral(null);
    setPagina(1);
    setPaginas(1);
    if (!elegido) return setArchivo(null);
    if (!esArchivoPlanoValido(elegido)) {
      setArchivo(null);
      return setErrorArchivo(mensajeArchivoPlanoInvalido);
    }
    setErrorArchivo(null);
    setArchivo(elegido);
    if (!esPdf(elegido)) return;
    try {
      setPaginas(await contarPaginasDelPdf(elegido));
    } catch {
      setArchivo(null);
      setErrorArchivo("No se pudo leer el PDF. Probá con otro archivo.");
    }
  };

  const faltaEdificio = !edificio.trim();
  const faltaPiso = !piso.trim();
  const faltaArchivo = !archivo;

  const continuar = async () => {
    setIntento(true);
    setErrorGeneral(null);
    if (faltaEdificio || faltaPiso || !archivo || errorArchivo) return;
    let plano: PlanoPisoDto;
    try {
      plano = await guardar.mutateAsync({
        edificio: edificio.trim(),
        piso: piso.trim(),
        archivo,
        pagina,
      });
    } catch (error) {
      setErrorGeneral(
        error instanceof RequestError && error.status === 503
          ? mensajeSinAlmacenamiento
          : error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado",
      );
      return;
    }
    try {
      const deteccion = await detectar.mutateAsync(plano.id);
      onListo({
        plano,
        deteccion,
        aviso: deteccion.aulas.length === 0 ? "No se detectaron aulas. Dibujalas a mano." : null,
      });
    } catch (error) {
      onListo({ plano, deteccion: { aulas: [] }, aviso: avisoDeDeteccion(error) });
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(evento) => {
        evento.preventDefault();
        void continuar();
      }}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoConSugerencias
            id="plano-edificio"
            etiqueta="Edificio"
            valor={edificio}
            opciones={edificios}
            error={intento && faltaEdificio ? "Ingresá el edificio" : undefined}
            onChange={setEdificio}
          />
          <CampoConSugerencias
            id="plano-piso"
            etiqueta="Piso"
            valor={piso}
            opciones={pisos}
            error={intento && faltaPiso ? "Ingresá el piso" : undefined}
            onChange={setPiso}
          />
        </div>
        <Field data-invalid={Boolean(errorArchivo) || (intento && faltaArchivo)}>
          <FieldLabel htmlFor="plano-archivo">Archivo del plano</FieldLabel>
          <Input
            id="plano-archivo"
            type="file"
            accept={archivoPlanoTipos.join(",")}
            onChange={(evento) => void elegirArchivo(evento.target.files?.[0])}
          />
          <FieldDescription>PDF, PNG o JPG de hasta 20 MB.</FieldDescription>
          <FieldError>
            {errorArchivo ?? (intento && faltaArchivo ? "Elegí el archivo del plano" : undefined)}
          </FieldError>
        </Field>
        {paginas > 1 ? (
          <Field>
            <FieldLabel htmlFor="plano-pagina">Página del plano</FieldLabel>
            <NativeSelect
              id="plano-pagina"
              className="w-full"
              value={pagina}
              onChange={(evento) => setPagina(Number(evento.target.value))}
            >
              {Array.from({ length: paginas }, (_, indice) => (
                <NativeSelectOption key={indice} value={indice + 1}>
                  Página {indice + 1}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </FieldGroup>
      {reemplaza ? (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            Este piso ya tiene plano: al continuar se reemplaza. Las aulas ya ubicadas conservan su
            polígono.
          </AlertDescription>
        </Alert>
      ) : null}
      {errorGeneral ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={procesando} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={procesando}>
          {procesando ? <Spinner /> : null}
          {detectar.isPending ? "Detectando aulas" : "Continuar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
