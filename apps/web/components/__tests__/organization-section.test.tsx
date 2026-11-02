import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationSection } from "@/components/settings/organization-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  settings: undefined as { name: string } | undefined,
}));

const updateSettingsMutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ data: state.settings }),
  useUpdateSettings: () => ({ mutateAsync: updateSettingsMutateAsync, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.settings = { name: "Organización de QA Admin" };
  updateSettingsMutateAsync.mockResolvedValue(state.settings);
});

describe("OrganizationSection", () => {
  it("mientras no llegan los ajustes muestra un esqueleto", () => {
    state.settings = undefined;
    renderWithProviders(<OrganizationSection />);
    expect(screen.queryByLabelText("Nombre de la institución")).toBeNull();
  });

  it("precarga el nombre actual y arranca con Guardar deshabilitado", async () => {
    renderWithProviders(<OrganizationSection />);
    expect(await screen.findByLabelText("Nombre de la institución")).toHaveValue(
      "Organización de QA Admin",
    );
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("guardar un nombre válido lo persiste, avisa y deja Guardar deshabilitado de nuevo", async () => {
    updateSettingsMutateAsync.mockResolvedValueOnce({ name: "Organización QA Norte" });
    renderWithProviders(<OrganizationSection />);
    const input = await screen.findByLabelText("Nombre de la institución");
    await userEvent.clear(input);
    await userEvent.type(input, "Organización QA Norte");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(updateSettingsMutateAsync).toHaveBeenCalledWith({ name: "Organización QA Norte" }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Institución actualizada");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled());
  });

  it("un nombre vacío o de solo espacios muestra error y no guarda", async () => {
    renderWithProviders(<OrganizationSection />);
    const input = await screen.findByLabelText("Nombre de la institución");
    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ingresá un nombre")).toBeVisible();
    expect(updateSettingsMutateAsync).not.toHaveBeenCalled();
  });

  it("recorta espacios y acepta hasta 100 caracteres", async () => {
    renderWithProviders(<OrganizationSection />);
    const input = await screen.findByLabelText("Nombre de la institución");
    await userEvent.clear(input);
    await userEvent.type(input, `  ${"a".repeat(100)}  `);
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(updateSettingsMutateAsync).toHaveBeenCalledWith({ name: "a".repeat(100) }),
    );
  });

  it("si falla el guardado avisa el error y conserva lo escrito", async () => {
    updateSettingsMutateAsync.mockRejectedValueOnce(new Error("network"));
    renderWithProviders(<OrganizationSection />);
    const input = await screen.findByLabelText("Nombre de la institución");
    await userEvent.clear(input);
    await userEvent.type(input, "Organización QA Norte");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(input).toHaveValue("Organización QA Norte");
  });
});
