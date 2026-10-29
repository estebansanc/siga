import { obtenerPoliticaVigente } from "@repo/api/services";
import type { Metadata } from "next";

import { nextRouteOf } from "@/components/auth/auth-routes";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { PoliticaPrivacidadCard } from "@/components/politica-privacidad/politica-privacidad-card";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Política de privacidad" };

export default async function PoliticaPrivacidadPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await requireSession();
  const politica = await obtenerPoliticaVigente(session);
  const { next } = await searchParams;
  const pendiente = politica.aceptadaEn === null;
  const card = (
    <PoliticaPrivacidadCard
      initialPolitica={politica}
      pendiente={pendiente}
      destino={nextRouteOf(new URLSearchParams(next ? { next } : {}))}
    />
  );

  if (pendiente)
    return <main className="mx-auto flex h-svh w-full max-w-3xl flex-col p-4">{card}</main>;
  return (
    <>
      <PageHeader title="Política de privacidad" />
      <PageBody>
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col p-4">{card}</div>
      </PageBody>
    </>
  );
}
