import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AyudaSection } from "@/components/ayuda/ayuda-section";
import { navigationItemsFor } from "@/components/layout/navigation";
import { renderWithProviders } from "@/test/render";

describe("AyudaSection", () => {
  it("abre en la guía rápida del perfil activo", () => {
    renderWithProviders(<AyudaSection perfil="DOCENTE" role="member" />);
    expect(screen.getByRole("tab", { name: "Guía rápida", selected: true })).toBeInTheDocument();
    expect(screen.getByText("Registrar tu asistencia con QR")).toBeInTheDocument();
    expect(screen.queryByText("Resolver una solicitud de aula")).not.toBeInTheDocument();
  });

  it("el manual del bedel Administrador tiene una sección por entrada del menú", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<AyudaSection perfil="BEDEL" role="owner" />);
    await user.click(screen.getByRole("tab", { name: "Manual de usuario" }));
    for (const item of navigationItemsFor("BEDEL", "owner")) {
      expect(screen.getByRole("button", { name: item.title })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("el manual del estudiante no incluye Configuración", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<AyudaSection perfil="ESTUDIANTE" role="member" />);
    await user.click(screen.getByRole("tab", { name: "Manual de usuario" }));
    expect(screen.queryByRole("button", { name: "Configuración" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comisiones" })).toBeInTheDocument();
  });
});
