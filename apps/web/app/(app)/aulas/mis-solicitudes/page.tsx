import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MisSolicitudesAula } from "@/components/aulas/mis-solicitudes-aula";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mis solicitudes" };

export default async function MisSolicitudesPage() {
  const session = await requireSession();
  if (session.perfil === "BEDEL") redirect("/solicitudes");
  if (session.perfil !== "DOCENTE") redirect("/");

  return (
    <>
      <PageHeader title="Mis solicitudes" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <MisSolicitudesAula />
        </div>
      </PageBody>
    </>
  );
}
