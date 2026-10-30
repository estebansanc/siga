"use client";

import type { Perfil } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AulaDetalleDialog } from "./aula-detalle-dialog";
import { AulaFormDialog } from "./aula-form-dialog";
import { AulasSection } from "./aulas-section";
import { PlanoAulas } from "./plano-aulas";

export type VistaAulas = "lista" | "plano";

const rutaDeVista = { lista: "/aulas", plano: "/aulas?vista=plano" } as const;

// Gestión de aulas del Bedel (RF-02): Lista y Plano comparten alta y detalle. La vista vive en la
// URL para que sobreviva a recargar.
export function AulasBedel({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const vista: VistaAulas = useSearchParams().get("vista") === "plano" ? "plano" : "lista";
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const cambiarVista = (valores: string[]) => {
    const elegida = valores.at(-1);
    if (elegida !== "lista" && elegida !== "plano") return;
    router.replace(rutaDeVista[elegida]);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          variant="outline"
          value={[vista]}
          onValueChange={cambiarVista}
          aria-label="Vista"
        >
          <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
          <ToggleGroupItem value="plano">Plano</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" onClick={() => setCreando(true)}>
          <PlusIcon />
          Nueva aula
        </Button>
      </div>
      {vista === "lista" ? (
        <AulasSection onDetalle={setDetalleId} />
      ) : (
        <PlanoAulas perfil={perfil} onAbrirAula={setDetalleId} />
      )}
      {creando ? <AulaFormDialog onClose={() => setCreando(false)} /> : null}
      {detalleId ? (
        <AulaDetalleDialog aulaId={detalleId} perfil={perfil} onClose={() => setDetalleId(null)} />
      ) : null}
    </>
  );
}
