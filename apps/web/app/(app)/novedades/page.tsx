import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { NovedadesSection } from "@/components/novedades/novedades-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Novedades" };

// Docente (las propias) y bedel (todas) publican; la autoridad solo las consulta.
export default async function NovedadesPage() {
  const session = await requireSession();
  if (session.perfil === "ESTUDIANTE") redirect("/");

  return (
    <>
      <PageHeader title="Novedades" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <NovedadesSection puedePublicar={session.perfil !== "AUTORIDAD"} />
        </div>
      </PageBody>
    </>
  );
}
