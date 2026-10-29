import type { MemberRole, Perfil } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { navigationFor } from "@/components/layout/navigation";
import { ayudaPorPerfil, contarPalabras, manualFor, maximoPalabrasGuia } from "@/lib/ayuda";

const perfiles: Perfil[] = ["ESTUDIANTE", "DOCENTE", "BEDEL", "AUTORIDAD"];
const roles: MemberRole[] = ["owner", "member"];

describe("ayuda", () => {
  it.each(perfiles)("Ayuda es la última entrada del menú de %s", (perfil) => {
    for (const role of roles) {
      const menu = navigationFor(perfil, role);
      expect(menu.at(-1)).toMatchObject({ title: "Ayuda", href: "/ayuda" });
    }
  });

  it.each(perfiles)("la guía de %s no supera el máximo de palabras", (perfil) => {
    expect(contarPalabras(ayudaPorPerfil[perfil].guia)).toBeLessThanOrEqual(maximoPalabrasGuia);
  });

  it.each(perfiles)("el manual de %s tiene una sección por entrada del menú", (perfil) => {
    for (const role of roles) {
      const titulos = manualFor(perfil, role).map((seccion) => seccion.titulo);
      for (const item of navigationFor(perfil, role)) expect(titulos).toContain(item.title);
      expect(titulos).toEqual(
        expect.arrayContaining(["Mi perfil", "Cambiar de organización", "Cerrar sesión"]),
      );
    }
  });

  it.each(perfiles)(
    "Configuración está en el manual de %s solo para el Administrador",
    (perfil) => {
      expect(manualFor(perfil, "owner").map((seccion) => seccion.titulo)).toContain(
        "Configuración",
      );
      expect(manualFor(perfil, "member").map((seccion) => seccion.titulo)).not.toContain(
        "Configuración",
      );
    },
  );
});
