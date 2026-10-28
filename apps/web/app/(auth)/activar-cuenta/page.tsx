import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivarCuentaForm } from "@/components/auth/activar-cuenta-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Activar cuenta" };

export default function ActivarCuentaPage() {
  return (
    <AuthShell>
      <Suspense>
        <ActivarCuentaForm />
      </Suspense>
    </AuthShell>
  );
}
