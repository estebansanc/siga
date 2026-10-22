"use client";

import type { ClaseDto } from "@repo/api/client";
import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@repo/ui/components/item";
import { ChevronRightIcon, DoorOpenIcon, MegaphoneIcon, QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PublicarNovedadDialog } from "@/components/novedades/publicar-novedad-dialog";

import { ClasesDelDia } from "./clases-del-dia";

// Panel del docente (CUR-05): sus clases de hoy y las acciones rápidas.
export function MisClasesDocente() {
  const [publicando, setPublicando] = useState<{ clase?: ClaseDto } | null>(null);

  return (
    <ClasesDelDia
      ambito="mias"
      emptyTitle="No tenés clases hoy"
      renderActions={(clase) =>
        ["AUSENTE", "SUSPENDIDA", "FINALIZADA"].includes(clase.estado) ? null : (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Publicar novedad sobre ${clase.materia.nombre} ${clase.comision.codigo}`}
            onClick={(event) => {
              event.stopPropagation();
              setPublicando({ clase });
            }}
          >
            <MegaphoneIcon />
            Novedad
          </Button>
        )
      }
    >
      <h2 className="font-medium">Acciones rápidas</h2>
      <ItemGroup className="gap-2">
        <Item variant="outline" render={<Link href="/asistencia" />}>
          <ItemMedia variant="icon">
            <QrCodeIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Registrar asistencia</ItemTitle>
            <ItemDescription>Escaneá el QR de bedelía al llegar al aula</ItemDescription>
          </ItemContent>
          <ChevronRightIcon className="text-muted-foreground size-4" />
        </Item>
        <Item
          variant="outline"
          render={<button type="button" onClick={() => setPublicando({})} />}
          className="w-full text-left"
        >
          <ItemMedia variant="icon">
            <MegaphoneIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Publicar novedad</ItemTitle>
            <ItemDescription>
              Ausencia, demora, virtual, suspensión o cambio de aula
            </ItemDescription>
          </ItemContent>
          <ChevronRightIcon className="text-muted-foreground size-4" />
        </Item>
        <Item variant="outline" render={<Link href="/aulas/solicitar" />}>
          <ItemMedia variant="icon">
            <DoorOpenIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Solicitar aula</ItemTitle>
            <ItemDescription>Buscá un aula por capacidad y recursos</ItemDescription>
          </ItemContent>
          <ChevronRightIcon className="text-muted-foreground size-4" />
        </Item>
      </ItemGroup>
      {publicando ? (
        <PublicarNovedadDialog
          open
          claseInicial={publicando.clase}
          onOpenChange={(open) => !open && setPublicando(null)}
        />
      ) : null}
    </ClasesDelDia>
  );
}
