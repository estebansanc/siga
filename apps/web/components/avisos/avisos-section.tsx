"use client";

import type { AvisoDto } from "@repo/api/client";
import type { AvisoPrecargado, VistaAvisos } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { ItemGroup } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { BellIcon, MailIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAvisos } from "@/hooks/use-avisos";
import { avisoDesdeQuery } from "@/lib/aviso-precargado";

import { AvisoItem } from "./aviso-item";
import { PublicarAvisoDialog } from "./publicar-aviso-dialog";
import { ResultadoEnviosDialog } from "./resultado-envios-dialog";

const vistaLabels: Record<VistaAvisos, string> = {
  VIGENTES: "Vigentes",
  HISTORIAL: "Historial",
  PUBLICADOS: "Publicados",
};

const vacios: Record<VistaAvisos, string> = {
  VIGENTES: "No hay avisos vigentes.",
  HISTORIAL: "Todavía no hay avisos vencidos.",
  PUBLICADOS: "Todavía no se publicó ningún aviso.",
};

// Vigentes e historial son para todos; quien publica ve además "Publicados" con el resultado de
// los envíos por correo (RF-14).
export function AvisosSection({ puedePublicar }: { puedePublicar: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [vista, setVista] = useState<VistaAvisos>("VIGENTES");
  // La precarga del cierre se toma una vez y se saca de la URL, para que recargar o volver a
  // abrir "Nuevo aviso" no la repita.
  const [publicando, setPublicando] = useState<{ precargado: AvisoPrecargado | null } | null>(
    () => {
      const precargado = puedePublicar ? avisoDesdeQuery(searchParams) : null;
      return precargado ? { precargado } : null;
    },
  );
  useEffect(() => {
    if (publicando?.precargado) router.replace("/avisos");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [viendoEnvios, setViendoEnvios] = useState<AvisoDto | null>(null);
  const avisos = useAvisos(vista);
  const vistas: VistaAvisos[] = puedePublicar
    ? ["VIGENTES", "HISTORIAL", "PUBLICADOS"]
    : ["VIGENTES", "HISTORIAL"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avisos</CardTitle>
        <CardDescription>Comunicados oficiales de la institución.</CardDescription>
        {puedePublicar ? (
          <CardAction>
            <Button size="sm" onClick={() => setPublicando({ precargado: null })}>
              <PlusIcon />
              Nuevo aviso
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={vista} onValueChange={(valor) => setVista(valor as VistaAvisos)}>
          <TabsList>
            {vistas.map((opcion) => (
              <TabsTrigger key={opcion} value={opcion}>
                {vistaLabels[opcion]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {!avisos.data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : avisos.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>{vacios[vista]}</EmptyTitle>
              <EmptyDescription>Los avisos que correspondan aparecen acá.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {avisos.data.map((aviso) => (
              <AvisoItem key={aviso.id} aviso={aviso}>
                {vista === "PUBLICADOS" && aviso.enviarPorCorreo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-fit"
                    onClick={() => setViendoEnvios(aviso)}
                  >
                    <MailIcon />
                    Resultado de envíos
                  </Button>
                ) : null}
              </AvisoItem>
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {publicando ? (
        <PublicarAvisoDialog
          precargado={publicando.precargado}
          onClose={() => setPublicando(null)}
        />
      ) : null}
      {viendoEnvios ? (
        <ResultadoEnviosDialog
          avisoId={viendoEnvios.id}
          titulo={viendoEnvios.titulo}
          onClose={() => setViendoEnvios(null)}
        />
      ) : null}
    </Card>
  );
}
