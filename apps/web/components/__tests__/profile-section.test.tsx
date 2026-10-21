import type { MeDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileSection } from "@/components/profile/profile-section";
import { renderWithProviders } from "@/test/render";

const updateProfile = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-me", () => ({
  useMe: (initialData: MeDto) => ({ data: initialData }),
  useUpdateProfile: () => ({ mutateAsync: updateProfile, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const me: MeDto = {
  userId: "u1",
  userName: "Ana Demo",
  userEmail: "ana@example.com",
  organizationId: "org-1",
  role: "owner",
  perfil: "BEDEL",
  organizations: [{ id: "org-1", name: "Organización de Ana", slug: "ana", role: "owner" }],
  lostOrganization: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  updateProfile.mockResolvedValue({ ...me, userName: "Ana Pérez" });
});

describe("ProfileSection", () => {
  it("precarga nombre y email (deshabilitado) y arranca con Guardar deshabilitado", () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ana Demo");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByText(/no se puede cambiar acá/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("guarda el nombre recortado, avisa y vuelve a deshabilitar Guardar", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    const input = screen.getByLabelText("Nombre");
    await userEvent.clear(input);
    await userEvent.type(input, "  Ana Pérez  ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: "Ana Pérez" }));
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Perfil actualizado");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled());
  });

  it("un nombre vacío muestra el error y no guarda", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    const input = screen.getByLabelText("Nombre");
    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Ingresá tu nombre")).toBeVisible();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
