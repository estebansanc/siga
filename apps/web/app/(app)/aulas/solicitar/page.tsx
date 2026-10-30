import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SolicitarAulaForm } from "@/components/aulas/solicitar-aula-form";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Solicitar aula" };

// Solo el Docente solicita aula; el Bedel asigna desde Solicitudes.
export default async function SolicitarAulaPage() {
  const session = await requireSession();
  if (session.perfil === "BEDEL") redirect("/solicitudes");
  if (session.perfil !== "DOCENTE") redirect("/");

  return (
    <>
      <PageHeader title="Solicitar aula" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <SolicitarAulaForm />
        </div>
      </PageBody>
    </>
  );
}
