import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConsultasHistoricas } from "@/components/historico/consultas-historicas";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Consultas históricas" };

// Solo la Autoridad académica consulta el histórico (RF-09); los demás perfiles vuelven al inicio.
export default async function HistoricoPage() {
  const session = await requireSession();
  if (session.perfil !== "AUTORIDAD") redirect("/");

  return (
    <>
      <PageHeader title="Consultas históricas" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
          <ConsultasHistoricas />
        </div>
      </PageBody>
    </>
  );
}
