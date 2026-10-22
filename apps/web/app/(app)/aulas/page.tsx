import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AulasSection } from "@/components/aulas/aulas-section";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aulas" };

// Solo el bedel gestiona aulas (RF-02); el docente va a sus solicitudes de aula (RF-06).
export default async function Page() {
  const session = await requireSession();
  if (session.perfil === "DOCENTE") redirect("/aulas/mis-solicitudes");
  if (session.perfil !== "BEDEL") {
    return (
      <Proximamente
        title="Aulas"
        description="Gestión de aulas y espacios: capacidad, equipamiento, disponibilidad y solicitudes."
      />
    );
  }

  return (
    <>
      <PageHeader title="Aulas" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <AulasSection />
        </div>
      </PageBody>
    </>
  );
}
