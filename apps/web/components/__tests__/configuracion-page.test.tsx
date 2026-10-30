import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/(app)/configuracion/page";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn().mockResolvedValue({ role: "owner" }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/components/settings/organization-section", () => ({
  OrganizationSection: () => <section>Institución</section>,
}));
vi.mock("@/components/settings/turnos-section", () => ({
  TurnosSection: () => <section>Turnos</section>,
}));
vi.mock("@/components/settings/presencia-section", () => ({
  PresenciaSection: () => <section>Presencia del docente</section>,
}));
vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/layout/page-body", () => ({
  PageBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Configuración", () => {
  it("muestra al Administrador la versión y el botón Qué hay de nuevo", async () => {
    render(await SettingsPage());
    expect(screen.getByText(/^Versión .+ \d+\.\d+$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qué hay de nuevo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Novedades" })).not.toBeInTheDocument();
  });
});
