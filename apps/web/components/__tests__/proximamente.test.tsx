import { SidebarProvider } from "@repo/ui/components/sidebar";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Proximamente } from "@/components/layout/proximamente";
import { renderWithProviders } from "@/test/render";

vi.mock("@/components/estado-institucional/estado-indicator", () => ({
  EstadoIndicator: () => null,
}));

describe("Proximamente", () => {
  it("muestra el título de la sección, el aviso y la vuelta al inicio", () => {
    renderWithProviders(
      <SidebarProvider>
        <Proximamente title="Avisos" description="Comunicados oficiales." />
      </SidebarProvider>,
    );
    expect(screen.getByRole("heading", { name: "Avisos" })).toBeInTheDocument();
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByText(/Comunicados oficiales\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
