import { redirect } from "next/navigation";

import { ComisionesSection } from "@/components/mi-cuenta/comisiones-section";
import { requireSession } from "@/lib/session";

export default async function MiCuentaComisionesPage() {
  const session = await requireSession();
  if (session.perfil !== "ESTUDIANTE") redirect("/mi-cuenta");

  return <ComisionesSection />;
}
