import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CuentaDesactivadaCard } from "@/components/auth/cuenta-desactivada-card";
import { renderWithProviders } from "@/test/render";

const { signOut, pushMock } = vi.hoisted(() => ({ signOut: vi.fn(), pushMock: vi.fn() }));

vi.mock("@repo/auth/client", () => ({ authClient: { signOut } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

describe("CuentaDesactivadaCard", () => {
  it("avisa que la cuenta está desactivada y permite cerrar sesión", async () => {
    signOut.mockResolvedValue(undefined);
    renderWithProviders(<CuentaDesactivadaCard />);
    expect(screen.getByText("Tu cuenta está desactivada")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalled();
  });
});
