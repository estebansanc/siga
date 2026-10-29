import type { Metadata } from "next";

import { AyudaSection } from "@/components/ayuda/ayuda-section";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Ayuda" };

// La ayuda depende del perfil activo de la sesión; todos los perfiles la tienen.
export default async function Page() {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="Ayuda" />
      <PageBody>
        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 p-4">
          <AyudaSection perfil={session.perfil} role={session.role} />
        </div>
      </PageBody>
    </>
  );
}
