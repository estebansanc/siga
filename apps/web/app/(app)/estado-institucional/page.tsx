import type { Metadata } from "next";

import { EstadoInstitucionalView } from "@/components/estado-institucional/estado-institucional-view";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Estado institucional" };

// Todos ven el estado y el historial (RF-08); solo el bedel lo cambia (RF-01).
export default async function EstadoInstitucionalPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="Estado institucional" />
      <PageBody>
        <EstadoInstitucionalView puedeCambiar={session.perfil === "BEDEL"} />
      </PageBody>
    </>
  );
}
