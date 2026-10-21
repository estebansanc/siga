import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Aulas" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Aulas"
      description="Gestión de aulas y espacios: capacidad, equipamiento, disponibilidad y solicitudes."
    />
  );
}
