import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EscanearAsistencia } from "@/components/asistencia/escanear-asistencia";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Registrar asistencia" };

// Solo el Docente registra su asistencia (RF-04); los demás perfiles vuelven al inicio.
export default async function Page() {
  const session = await requireSession();
  if (session.perfil !== "DOCENTE") redirect("/");

  return (
    <>
      <PageHeader title="Registrar asistencia" />
      <PageBody>
        <EscanearAsistencia />
      </PageBody>
    </>
  );
}
