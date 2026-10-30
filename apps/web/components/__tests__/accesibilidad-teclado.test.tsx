import { SidebarProvider, SidebarTrigger } from "@repo/ui/components/sidebar";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { AppVersion } from "@/components/settings/app-version";

beforeAll(() => {
  if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe("Botones de solo ícono", () => {
  it("el botón de Qué hay de nuevo y el del menú lateral tienen nombre accesible con su acción", () => {
    render(
      <SidebarProvider>
        <SidebarTrigger />
        <AppVersion />
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Alternar menú lateral" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qué hay de nuevo" })).toBeInTheDocument();
  });
});

describe("Diálogos con teclado", () => {
  it("Enter abre Qué hay de nuevo, Escape lo cierra y el foco vuelve al botón que lo abrió", async () => {
    render(<AppVersion />);
    const abrir = screen.getByRole("button", { name: "Qué hay de nuevo" });
    abrir.focus();

    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Qué hay de nuevo" })).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(abrir).toHaveFocus();
  });
});
