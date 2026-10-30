import { SidebarProvider } from "@repo/ui/components/sidebar";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NavUser } from "@/components/layout/nav-user";
import { renderWithProviders } from "@/test/render";

const { signOut, pushMock } = vi.hoisted(() => ({ signOut: vi.fn(), pushMock: vi.fn() }));

vi.mock("@repo/auth/client", () => ({ authClient: { signOut } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
});

const renderNavUser = () =>
  renderWithProviders(
    <SidebarProvider>
      <NavUser user={{ name: "Ana Uno", email: "uno@example.com" }} />
    </SidebarProvider>,
  );

describe("NavUser", () => {
  it("muestra nombre y email y ofrece Mi cuenta", async () => {
    renderNavUser();
    expect(screen.getByTestId("user-menu-trigger")).toHaveTextContent("Ana Uno");
    expect(screen.getByTestId("user-menu-trigger")).toHaveTextContent("uno@example.com");
    await userEvent.click(screen.getByTestId("user-menu-trigger"));
    expect(await screen.findByRole("menuitem", { name: "Mi cuenta" })).toHaveAttribute(
      "href",
      "/mi-cuenta",
    );
  });

  it("ofrece releer la política de privacidad", async () => {
    renderNavUser();
    await userEvent.click(screen.getByTestId("user-menu-trigger"));
    expect(await screen.findByRole("menuitem", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/politica-de-privacidad",
    );
  });

  it("cerrar sesión limpia la caché y va al login", async () => {
    const { queryClient } = renderNavUser();
    const clear = vi.spyOn(queryClient, "clear");

    await userEvent.click(screen.getByTestId("user-menu-trigger"));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cerrar sesión" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });
});
