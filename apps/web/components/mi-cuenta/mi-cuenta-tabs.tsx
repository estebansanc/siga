"use client";

import type { Perfil } from "@repo/domain";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Pestana = {
  value: string;
  label: string;
  href: "/mi-cuenta" | "/mi-cuenta/comisiones" | "/mi-cuenta/notificaciones";
};

const perfilTab: Pestana = { value: "perfil", label: "Perfil", href: "/mi-cuenta" };
const comisionesTab: Pestana = {
  value: "comisiones",
  label: "Comisiones",
  href: "/mi-cuenta/comisiones",
};
const notificacionesTab: Pestana = {
  value: "notificaciones",
  label: "Notificaciones",
  href: "/mi-cuenta/notificaciones",
};

const pestanasDeMiCuenta = (perfil: Perfil): Pestana[] =>
  perfil === "ESTUDIANTE"
    ? [perfilTab, comisionesTab, notificacionesTab]
    : [perfilTab, notificacionesTab];

export function MiCuentaTabs({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();
  const pestanas = pestanasDeMiCuenta(perfil);
  const activa = pestanas.find((pestana) => pestana.href === pathname)?.value ?? "perfil";

  return (
    <Tabs value={activa}>
      <TabsList aria-label="Secciones de Mi cuenta">
        {pestanas.map((pestana) => (
          <TabsTrigger
            key={pestana.value}
            value={pestana.value}
            render={<Link href={pestana.href} />}
          >
            {pestana.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
