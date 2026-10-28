import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActivarCuentaForm } from "@/components/auth/activar-cuenta-form";
import { renderWithProviders } from "@/test/render";

const { resetPassword, signInEmail, pushMock, state } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  signInEmail: vi.fn(),
  pushMock: vi.fn(),
  state: { search: "token=tok-1&email=ana%40example.com" },
}));

vi.mock("@repo/auth/client", () => ({
  authClient: { resetPassword, signIn: { email: signInEmail } },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));

const submit = async (password: string) => {
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
  await userEvent.click(screen.getByRole("button", { name: /Definir contraseña/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.search = "token=tok-1&email=ana%40example.com";
  resetPassword.mockResolvedValue({ error: null });
  signInEmail.mockResolvedValue({ error: null });
});

describe("ActivarCuentaForm", () => {
  it("define la contraseña con el enlace e ingresa", async () => {
    renderWithProviders(<ActivarCuentaForm />);
    await submit("clave1234");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(resetPassword).toHaveBeenCalledWith({ newPassword: "clave1234", token: "tok-1" });
    expect(signInEmail).toHaveBeenCalledWith({ email: "ana@example.com", password: "clave1234" });
  });

  it("rechaza una contraseña sin números antes de llamar a la API", async () => {
    renderWithProviders(<ActivarCuentaForm />);
    await submit("sololetras");
    expect(await screen.findByText("Usá 8 caracteres o más, con letras y números")).toBeVisible();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("un enlace vencido o usado se informa", async () => {
    resetPassword.mockResolvedValue({ error: { code: "INVALID_TOKEN" } });
    renderWithProviders(<ActivarCuentaForm />);
    await submit("clave1234");
    expect(await screen.findByText("El enlace ya no sirve")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("sin token en la dirección muestra el enlace inválido", () => {
    state.search = "";
    renderWithProviders(<ActivarCuentaForm />);
    expect(screen.getByText("El enlace ya no sirve")).toBeInTheDocument();
  });
});
