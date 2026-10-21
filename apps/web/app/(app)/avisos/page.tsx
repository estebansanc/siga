import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Avisos" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Avisos"
      description="Comunicados oficiales de la institución, segmentados y con aviso por correo."
    />
  );
}
