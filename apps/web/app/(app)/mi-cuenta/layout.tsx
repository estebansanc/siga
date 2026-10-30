import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { MiCuentaTabs } from "@/components/mi-cuenta/mi-cuenta-tabs";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function MiCuentaLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="Mi cuenta" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <MiCuentaTabs perfil={session.perfil} />
          {children}
        </div>
      </PageBody>
    </>
  );
}
