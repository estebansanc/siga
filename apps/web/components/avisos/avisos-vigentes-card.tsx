"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ItemGroup } from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";

import { useAvisos } from "@/hooks/use-avisos";

import { AvisoItem } from "./aviso-item";

export function AvisosVigentesCard() {
  const avisos = useAvisos("VIGENTES");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avisos vigentes</CardTitle>
        <CardDescription>Comunicados oficiales que te corresponden.</CardDescription>
      </CardHeader>
      <CardContent>
        {!avisos.data ? (
          <Skeleton className="h-16 w-full" />
        ) : avisos.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay avisos vigentes.</p>
        ) : (
          <ItemGroup className="gap-2">
            {avisos.data.map((aviso) => (
              <AvisoItem key={aviso.id} aviso={aviso} />
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
