import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { SolicitudesAulaSection } from "@/components/solicitudes/solicitudes-aula-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Solicitudes de aula" };

// Solo el bedel resuelve solicitudes y asigna aulas (RF-16); los demás vuelven a su inicio.
export default async function Page() {
  const session = await requireSession();
  if (session.perfil !== "BEDEL") redirect("/");

  return (
    <>
      <PageHeader title="Solicitudes de aula" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <SolicitudesAulaSection />
        </div>
      </PageBody>
    </>
  );
}
