import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { BajaCorreoCard } from "@/components/preferencias/baja-correo-card";

export const metadata: Metadata = { title: "Dejar de recibir correos" };

export default async function BajaCorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell>
      <BajaCorreoCard token={token ?? ""} />
    </AuthShell>
  );
}
