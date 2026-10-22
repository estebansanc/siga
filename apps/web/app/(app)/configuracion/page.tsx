import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { AppVersion } from "@/components/settings/app-version";
import { MembersSection } from "@/components/settings/members-section";
import { OrganizationSection } from "@/components/settings/organization-section";
import { PresenciaSection } from "@/components/settings/presencia-section";
import { TurnosSection } from "@/components/settings/turnos-section";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Configuración" };

// Configuración es de la organización propia: un miembro de una organización ajena no la ve en
// la barra lateral y, por URL, vuelve al inicio.
export default async function SettingsPage() {
  const session = await requireSession();
  if (session.role !== "owner") redirect("/");

  return (
    <>
      <PageHeader title="Configuración" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <OrganizationSection />
          <TurnosSection />
          <PresenciaSection />
          <MembersSection currentUserId={session.userId} />
          <AppVersion />
        </div>
      </PageBody>
    </>
  );
}
