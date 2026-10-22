import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SolicitarAulaForm } from "@/components/aulas/solicitar-aula-form";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Solicitar aula" };

// Docente (sus comisiones) y Bedel (todas); estudiantes y autoridades no solicitan aulas.
export default async function SolicitarAulaPage() {
  const session = await requireSession();
  if (session.perfil !== "DOCENTE" && session.perfil !== "BEDEL") redirect("/");

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
