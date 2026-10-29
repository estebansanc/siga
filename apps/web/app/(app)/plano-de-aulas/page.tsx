import type { Metadata } from "next";

import { PlanoAulas } from "@/components/aulas/plano-aulas";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Plano de aulas" };

export default async function PlanoDeAulasPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="Plano de aulas" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
          <PlanoAulas perfil={session.perfil} />
        </div>
      </PageBody>
    </>
  );
}
