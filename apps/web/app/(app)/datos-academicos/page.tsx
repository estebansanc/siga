import type { Metadata } from "next";

import { DatosAcademicosSection } from "@/components/datos-academicos/datos-academicos-section";
import { AccesoDenegado } from "@/components/errors/acceso-denegado";
import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Datos académicos" };

// Bedel y Autoridad administran los datos académicos base (RF-13); el resto ve "Acceso denegado".
export default async function Page() {
  const session = await requireSession();
  const autorizado = session.perfil === "BEDEL" || session.perfil === "AUTORIDAD";

  return (
    <>
      <PageHeader title="Datos académicos" />
      <PageBody>
        {autorizado ? (
          <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 p-4">
            <DatosAcademicosSection />
          </div>
        ) : (
          <AccesoDenegado />
        )}
      </PageBody>
    </>
  );
}
