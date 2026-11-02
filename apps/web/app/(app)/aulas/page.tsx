import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AulasBedel } from "@/components/aulas/aulas-bedel";
import { PlanoAulas } from "@/components/aulas/plano-aulas";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aulas" };

// Solo el bedel gestiona aulas (RF-02) y alterna Lista / Plano; el docente va a sus solicitudes de
// aula (RF-06) salvo que pida el Plano; el resto consulta el Plano.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await requireSession();
  const { vista } = await searchParams;
  if (session.perfil === "DOCENTE" && vista !== "plano") redirect("/solicitudes");

  return (
    <>
      <PageHeader title="Aulas" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
          {session.perfil === "BEDEL" ? (
            <AulasBedel perfil={session.perfil} />
          ) : (
            <PlanoAulas perfil={session.perfil} />
          )}
        </div>
      </PageBody>
    </>
  );
}
