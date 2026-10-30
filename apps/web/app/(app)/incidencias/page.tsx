import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IncidenciasSection } from "@/components/incidencias/incidencias-section";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Incidencias" };

// Solo el bedel gestiona incidencias (RF-15) y la autoridad las consulta; el docente las
// reporta desde Mis clases.
export default async function Page() {
  const session = await requireSession();
  if (session.perfil !== "BEDEL" && session.perfil !== "AUTORIDAD") redirect("/");

  return (
    <>
      <PageHeader title="Incidencias" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <IncidenciasSection puedeGestionar={session.perfil === "BEDEL"} />
        </div>
      </PageBody>
    </>
  );
}
