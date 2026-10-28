import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { CuentaDesactivadaCard } from "@/components/auth/cuenta-desactivada-card";

export const metadata: Metadata = { title: "Cuenta desactivada" };

export default function CuentaDesactivadaPage() {
  return (
    <AuthShell>
      <CuentaDesactivadaCard />
    </AuthShell>
  );
}
