import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Consultas históricas" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Consultas históricas"
      description="Asistencia docente, novedades, uso de aulas e incidencias consolidados."
    />
  );
}
