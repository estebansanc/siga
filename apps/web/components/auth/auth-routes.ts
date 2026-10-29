import type { Route } from "next";

const defaultRoute: Route = "/";

// Solo rutas internas: un `next` con host o protocolo no se sigue. El type guard evita el
// cast: con rutas tipadas (`next build`) Route es una unión estricta y sin rutas tipadas
// (lint sin `.next/types`) es un alias de `string`, y ninguno de los dos necesita `as Route`.
export const isInternalRoute = (value: string): value is Route =>
  value.startsWith("/") && !value.startsWith("//");

export const nextRouteOf = (searchParams: URLSearchParams): Route => {
  const next = searchParams.get("next");
  return next && isInternalRoute(next) ? next : defaultRoute;
};

export const authRouteWithNext = (route: "/login" | "/registro", next: Route): Route =>
  next === defaultRoute ? route : (`${route}?next=${encodeURIComponent(next)}` as Route);
