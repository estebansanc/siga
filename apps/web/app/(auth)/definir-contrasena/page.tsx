import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { DefinirContrasenaForm } from "@/components/auth/definir-contrasena-form";

export const metadata: Metadata = { title: "Definir contraseña" };

export default function DefinirContrasenaPage() {
  return (
    <AuthShell>
      <Suspense>
        <DefinirContrasenaForm />
      </Suspense>
    </AuthShell>
  );
}
