import { getAuthContext, isAccountDeactivated } from "@repo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

// Layout, metadata y página comparten la lectura de sesión de la misma request.
const readSession = cache(async () => getAuthContext(await headers()));

export const requireSession = async () => {
  const context = await readSession();
  if (context) return context;
  if (await isAccountDeactivated(await headers())) redirect("/cuenta-desactivada");
  redirect("/login");
};
