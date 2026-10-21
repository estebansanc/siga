import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Datos académicos" };

export default async function Page() {
  await requireSession();
  return (
    <Proximamente
      title="Datos académicos"
      description="Carreras, materias, comisiones, horarios y períodos lectivos."
    />
  );
}
