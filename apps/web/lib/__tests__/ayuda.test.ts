import type { MemberRole, Perfil } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { navigationItemsFor } from "@/components/layout/navigation";
import { ayudaPorPerfil, contarPalabras, manualFor, maximoPalabrasGuia } from "@/lib/ayuda";

const perfiles: Perfil[] = ["ESTUDIANTE", "DOCENTE", "BEDEL", "AUTORIDAD"];
const roles: MemberRole[] = ["owner", "member"];

describe("ayuda", () => {
  it.each(perfiles)("Ayuda es la última entrada del menú de %s", (perfil) => {
    for (const role of roles) {
      const menu = navigationItemsFor(perfil, role);
      expect(menu.at(-1)).toMatchObject({ title: "Ayuda", href: "/ayuda" });
    }
  });

  it.each(perfiles)("el manual de %s no tiene una sección Plano de aulas", (perfil) => {
    const titulos = manualFor(perfil, "member").map((seccion) => seccion.titulo);
    expect(titulos).not.toContain("Plano de aulas");
  });

  it.each(perfiles)("la guía de %s no supera el máximo de palabras", (perfil) => {
    expect(contarPalabras(ayudaPorPerfil[perfil].guia)).toBeLessThanOrEqual(maximoPalabrasGuia);
  });

  it.each(perfiles)("el manual de %s tiene una sección por entrada del menú", (perfil) => {
    for (const role of roles) {
      const titulos = manualFor(perfil, role).map((seccion) => seccion.titulo);
      for (const item of navigationItemsFor(perfil, role)) expect(titulos).toContain(item.title);
      expect(titulos).toEqual(expect.arrayContaining(["Mi cuenta", "Cerrar sesión"]));
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

  it("el manual separa Configuración de la gestión de personas", () => {
    const manual = manualFor("BEDEL", "owner");
    const texto = (titulo: string) =>
      JSON.stringify(manual.find((seccion) => seccion.titulo === titulo)).toLowerCase();
    expect(texto("Configuración")).not.toContain("miembros");
    expect(texto("Usuarios")).toContain("administrador");
  });

  it("el manual del Administrador explica cómo abrir Qué hay de nuevo en Configuración", () => {
    const configuracion = manualFor("BEDEL", "owner").find(
      (seccion) => seccion.titulo === "Configuración",
    );
    expect(JSON.stringify(configuracion?.pasos)).toContain("Qué hay de nuevo");
  });

  it.each(perfiles)("el manual de %s no habla de organizaciones", (perfil) => {
    const texto = JSON.stringify(manualFor(perfil, "owner")).toLowerCase();
    expect(texto).not.toContain("organizaci");
    expect(texto).toContain("los demás usuarios ven tus cambios enseguida.");
  });

  it("el manual del Administrador describe Configuración como de la institución", () => {
    const configuracion = manualFor("BEDEL", "owner").find((s) => s.titulo === "Configuración");
    expect(configuracion?.paraQueSirve).toBe(
      "Administra la institución: nombre, turnos, presencia del docente y versión.",
    );
    expect(configuracion?.mensajes).toContain("Solo el Administrador ve esta sección.");
  });

  it("la guía de cada perfil tiene exactamente las tareas del ticket", () => {
    const titulos = (perfil: Perfil) => ayudaPorPerfil[perfil].guia.map((tarea) => tarea.titulo);
    expect(titulos("ESTUDIANTE")).toEqual([
      "Elegir las comisiones que seguís",
      "Ver tus clases del día con estado y novedades",
      "Consultar las clases",
      "Leer los avisos",
    ]);
    expect(titulos("DOCENTE")).toEqual([
      "Ver tus clases del día",
      "Registrar tu asistencia con QR",
      "Publicar una novedad",
      "Editar o finalizar una novedad",
      "Solicitar un aula",
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
      "Consultar las clases",
      "Consultar los históricos",
      "Publicar un aviso",
      "Consultar el estado institucional",
    ]);
  });

  it("ningún perfil menciona Buscar ni Clases de hoy y todos describen Clases", () => {
    for (const perfil of ["ESTUDIANTE", "DOCENTE", "BEDEL", "AUTORIDAD"] as const) {
      const texto = JSON.stringify(ayudaPorPerfil[perfil]);
      expect(texto).not.toMatch(/"Buscar"|Clases de hoy/);
      expect(ayudaPorPerfil[perfil].manual.map((seccion) => seccion.titulo)).toContain("Clases");
    }
  });

  it("la Ayuda del Estudiante dice que Comisiones y Notificaciones se guardan en el momento, sin Guardar", () => {
    const { guia, manual } = ayudaPorPerfil.ESTUDIANTE;
    const tarea = guia.find((item) => item.titulo === "Elegir las comisiones que seguís");
    const secciones = manualFor("ESTUDIANTE", "member").filter((seccion) =>
      ["Comisiones", "Notificaciones"].includes(seccion.titulo),
    );
    expect(manual).toBeDefined();
    expect(secciones).toHaveLength(2);
    const textos = [tarea, ...secciones].map((item) => JSON.stringify(item));
    expect(textos).toHaveLength(3);
    for (const texto of textos) {
      expect(texto).not.toContain("Guardar");
      expect(texto).toMatch(/se guardan? en el momento/);
    }
  });
});
