import { getAuthContext, isAccountDeactivated } from "@repo/auth";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { requestedPathHeader } from "@/lib/requested-path";

// Layout, metadata y página comparten la lectura de sesión de la misma request.
const readSession = cache(async () => getAuthContext(await headers()));

// El handler de /api/sesion-vencida no es una página y no figura entre las rutas tipadas.
const isRoute = (value: string): value is Route => value.startsWith("/");

export const requireSession = async () => {
  const context = await readSession();
  if (context) return context;
  if (await isAccountDeactivated(await headers())) redirect("/cuenta-desactivada");
  const requestedPath = (await headers()).get(requestedPathHeader);
  const params = requestedPath ? `?next=${encodeURIComponent(requestedPath)}` : "";
  const destination = `/api/sesion-vencida${params}`;
  if (isRoute(destination)) redirect(destination);
  redirect("/login");
};
