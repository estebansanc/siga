import type { Metadata } from "next";

import { nextRouteOf } from "@/components/auth/auth-routes";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Ingresar" };

type LoginPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const firstValues = (params: Record<string, string | string[] | undefined>) =>
  new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined ? [] : [[key, first]];
    }),
  );

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = firstValues(await searchParams);
  return (
    <AuthShell>
      <LoginForm
        next={nextRouteOf(params)}
        passwordUpdated={params.get("contrasena") === "actualizada"}
      />
    </AuthShell>
  );
}
