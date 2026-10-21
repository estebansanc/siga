import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Registrar asistencia" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Registrar asistencia"
      description="Registrá tu presencia escaneando el QR de bedelía al llegar al aula."
    />
  );
}
