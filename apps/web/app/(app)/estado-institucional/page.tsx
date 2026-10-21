import type { Metadata } from "next";

import { CambiarEstadoForm } from "@/components/estado-institucional/cambiar-estado-form";
import { EstadoActualCard } from "@/components/estado-institucional/estado-actual-card";
import { HistorialTable } from "@/components/estado-institucional/historial-table";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Estado institucional" };

// Todos ven el estado y el historial (RF-08); solo el bedel lo cambia (RF-01).
export default async function EstadoInstitucionalPage() {
  const session = await requireSession();
  const esBedel = session.perfil === "BEDEL";

  return (
    <>
      <PageHeader title="Estado institucional" />
      <PageBody>
        <div className="mx-auto grid w-full max-w-5xl gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-4">
            <EstadoActualCard />
            {esBedel ? <CambiarEstadoForm /> : null}
          </div>
          <HistorialTable />
        </div>
      </PageBody>
    </>
  );
}
