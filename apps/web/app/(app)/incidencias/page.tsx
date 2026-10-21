import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Incidencias" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Incidencias"
      description="Registro y seguimiento de incidencias de infraestructura y equipamiento."
    />
  );
}
