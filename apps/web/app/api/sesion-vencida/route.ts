import { NextResponse, type NextRequest } from "next/server";

import { authRouteWithNext, nextRouteOf } from "@/components/auth/auth-routes";

const sessionCookieNames = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

// Una sesión vencida o cerrada desde otro dispositivo deja su cookie en el navegador, y con ella
// el proxy mandaría /login de vuelta al inicio en bucle: se la borra antes de pedir login.
export function GET(request: NextRequest) {
  const next = nextRouteOf(request.nextUrl.searchParams);
  const response = NextResponse.redirect(new URL(authRouteWithNext("/login", next), request.url));
  for (const name of sessionCookieNames) {
    response.cookies.set(name, "", { maxAge: 0, path: "/", secure: name.startsWith("__Secure-") });
  }
  return response;
}
