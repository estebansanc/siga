import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "QR de asistencia" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="QR de asistencia"
      description="Generación del código QR de asistencia docente por aula y turno."
    />
  );
}
