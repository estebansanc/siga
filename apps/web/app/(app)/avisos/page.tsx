import type { Metadata } from "next";
import { Suspense } from "react";

import { AvisosSection } from "@/components/avisos/avisos-section";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Avisos" };

// Todos ven los avisos que les corresponden; Bedel y Autoridad además los publican (RF-14).
export default async function AvisosPage() {
  const session = await requireSession();
  const puedePublicar = session.perfil === "BEDEL" || session.perfil === "AUTORIDAD";

  return (
    <>
      <PageHeader title="Avisos" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <Suspense>
            <AvisosSection puedePublicar={puedePublicar} />
          </Suspense>
        </div>
      </PageBody>
    </>
  );
}
