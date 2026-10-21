import type { Metadata } from "next";

import { BuscarClases } from "@/components/clases/buscar-clases";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Buscar clases" };

export default async function ClasesPage() {
  await requireSession();

  return (
    <>
      <PageHeader title="Buscar clases" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <BuscarClases />
        </div>
      </PageBody>
    </>
  );
}
