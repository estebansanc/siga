import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { PreferenciasSection } from "@/components/preferencias/preferencias-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Preferencias" };

export default async function PreferenciasPage() {
  const session = await requireSession();
  if (session.perfil !== "ESTUDIANTE") redirect("/");

  return (
    <>
      <PageHeader title="Preferencias" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <PreferenciasSection />
        </div>
      </PageBody>
    </>
  );
}
