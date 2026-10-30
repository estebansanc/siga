import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { requestedPathHeader } from "@/lib/requested-path";

// Con sesión, login y registro redirigen al inicio. La página offline y la recuperación de contraseña se
// abren igual con o sin sesión.
const authRoutes = ["/login", "/registro"];
const openRoutes = ["/~offline", "/recuperar-contrasena", "/definir-contrasena"];
// Rutas internas de la app: piden sesión. Una URL que no está en esta lista (incluida una que
// no exista) sigue de largo y la resuelve Next, que la 404 con la pantalla neutra en vez de
// pedir login primero: el proxy no sabe qué rutas existen de verdad, así que solo protege las
// que sabe que son de la app. Toda ruta nueva de la app va también acá.
const protectedRoutes = [
  "/",
  "/configuracion",
  "/mi-cuenta",
  "/mi-perfil",
  "/clases",
  "/novedades",
  "/estado-institucional",
  "/preferencias",
  "/avisos",
  "/asistencia",
  "/aulas",
  "/qr",
  "/solicitudes",
  "/incidencias",
  "/usuarios",
  "/datos-academicos",
  "/historico",
  "/politica-de-privacidad",
];

const startsWithAny = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

// La cookie de sesión puede seguir en el navegador con la sesión ya vencida o cerrada desde otro
// dispositivo: `requireSession` necesita la ruta pedida para mandar al login con `next`.
const withRequestedPath = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.set(requestedPathHeader, request.nextUrl.pathname + request.nextUrl.search);
  return headers;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isAuthRoute = startsWithAny(pathname, authRoutes);
  const isOpenRoute = startsWithAny(pathname, openRoutes);
  const isProtectedRoute = startsWithAny(pathname, protectedRoutes);

  if (isOpenRoute) return NextResponse.next();
  if (!hasSession && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (isProtectedRoute)
    return NextResponse.next({ request: { headers: withRequestedPath(request) } });
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|serwist|_next/static|_next/image|icons|manifest.webmanifest|favicon.ico).*)"],
};
