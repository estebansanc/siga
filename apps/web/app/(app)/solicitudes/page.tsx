import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MisSolicitudesAula } from "@/components/aulas/mis-solicitudes-aula";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { SolicitudesAulaSection } from "@/components/solicitudes/solicitudes-aula-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Solicitudes de aula" };

// El bedel resuelve solicitudes y asigna aulas (RF-16); el docente ve las suyas y pide aula (RF-06);
// los demás perfiles vuelven a su inicio.
export default async function Page() {
  const session = await requireSession();
  if (session.perfil !== "BEDEL" && session.perfil !== "DOCENTE") redirect("/");

  return (
    <>
      <PageHeader title="Solicitudes de aula" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          {session.perfil === "BEDEL" ? <SolicitudesAulaSection /> : <MisSolicitudesAula />}
        </div>
      </PageBody>
    </>
  );
}
