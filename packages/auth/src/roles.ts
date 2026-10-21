import type { MemberRole } from "@repo/domain";

// Better Auth guarda el rol como texto ("owner" o una lista separada por comas con otros
// roles); única fuente de verdad para leerlo, reexportada para el resto de la API.
export const roleOf = (role: string): MemberRole =>
  role.split(",").includes("owner") ? "owner" : "member";
