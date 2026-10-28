import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { DominiosPermitidosSection } from "@/components/usuarios/dominios-permitidos-section";
import { UsuariosSection } from "@/components/usuarios/usuarios-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Usuarios" };

// Bedel y Autoridad administran usuarios (RF-10); el resto vuelve al inicio.
export default async function Page() {
  const session = await requireSession();
  if (session.perfil !== "BEDEL" && session.perfil !== "AUTORIDAD") redirect("/");

  return (
    <>
      <PageHeader title="Usuarios" />
      <PageBody>
        <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-4 p-4">
          <UsuariosSection />
          <DominiosPermitidosSection />
        </div>
      </PageBody>
    </>
  );
}
