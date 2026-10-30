import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MisClasesDocente } from "@/components/clases/mis-clases-docente";
import { MisClasesHoy } from "@/components/clases/mis-clases-hoy";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mis clases de hoy" };

// Cada perfil llega a su panel (requerimientos.md, "Paneles principales por perfil").
export default async function HomePage() {
  const session = await requireSession();
  if (session.perfil === "AUTORIDAD") redirect("/clases");
  if (session.perfil === "BEDEL") redirect("/estado-institucional");

  return (
    <>
      <PageHeader title="Mis clases de hoy" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          {session.perfil === "ESTUDIANTE" ? <MisClasesHoy /> : <MisClasesDocente />}
        </div>
      </PageBody>
    </>
  );
}
