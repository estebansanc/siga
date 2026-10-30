import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { QrAsistencia } from "@/components/qr/qr-asistencia";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Asistencia docente" };

// Solo el Bedel genera el QR (RF-03); los demás perfiles vuelven al inicio.
export default async function QrPage() {
  const session = await requireSession();
  if (session.perfil !== "BEDEL") redirect("/");

  return (
    <>
      <PageHeader title="Asistencia docente" />
      <PageBody>
        <QrAsistencia />
      </PageBody>
    </>
  );
}
