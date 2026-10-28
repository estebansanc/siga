import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RecuperarContrasenaForm } from "@/components/auth/recuperar-contrasena-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarContrasenaPage() {
  return (
    <AuthShell>
      <RecuperarContrasenaForm />
    </AuthShell>
  );
}
