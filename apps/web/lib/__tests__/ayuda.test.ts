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

  it("la guía de cada perfil tiene exactamente las tareas del ticket", () => {
    const titulos = (perfil: Perfil) => ayudaPorPerfil[perfil].guia.map((tarea) => tarea.titulo);
    expect(titulos("ESTUDIANTE")).toEqual([
      "Elegir las comisiones que seguís",
      "Ver tus clases del día con estado y novedades",
      "Buscar una clase",
      "Leer los avisos",
    ]);
    expect(titulos("DOCENTE")).toEqual([
      "Ver tus clases del día",
      "Registrar tu asistencia con QR",
      "Publicar una novedad",
      "Editar o finalizar una novedad",
      "Consultar aulas",
    ]);
    expect(titulos("BEDEL")).toEqual([
      "Registrar la apertura o el cierre de la institución",
      "Consultar las clases del día",
      "Publicar una novedad",
      "Generar el QR de asistencia",
      "Resolver una solicitud de aula",
      "Registrar una incidencia",
      "Publicar un aviso",
    ]);
    expect(titulos("AUTORIDAD")).toEqual([
      "Ver las clases de hoy",
      "Consultar los históricos",
      "Publicar un aviso",
      "Consultar el estado institucional",
    ]);
  });
});
