import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Solicitudes de aula" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Solicitudes de aula"
      description="Aprobación y rechazo de las solicitudes de aula de los docentes."
    />
  );
}
