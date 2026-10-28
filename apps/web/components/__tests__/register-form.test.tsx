import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "@/components/auth/register-form";
import { renderWithProviders } from "@/test/render";

const { signUpEmail, signInWithGoogle, pushMock, state } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  pushMock: vi.fn(),
  state: { search: "" },
}));

vi.mock("@repo/auth/client", () => ({
  authClient: { signUp: { email: signUpEmail } },
  signInWithGoogle,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Ana Nueva");
  await userEvent.type(screen.getByLabelText("Email"), "nueva@example.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "secret123");
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.search = "";
  signUpEmail.mockResolvedValue({ error: null });
  signInWithGoogle.mockResolvedValue(undefined);
});

describe("RegisterForm", () => {
  it("tras registrarse pide revisar el correo, sin entrar todavía", async () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Ingresá" })).toHaveAttribute("href", "/login");
    await fillAndSubmit();
    expect(await screen.findByText("Revisá tu correo")).toBeInTheDocument();
    expect(screen.getByText(/nueva@example.com/)).toBeInTheDocument();
    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "nueva@example.com", callbackURL: "/" }),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("el enlace de verificación vuelve al destino pedido y el link a Ingresar lo conserva", async () => {
    state.search = "next=%2Fclases";
    renderWithProviders(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Ingresá" })).toHaveAttribute(
      "href",
      "/login?next=%2Fclases",
    );
    await fillAndSubmit();
    await screen.findByText("Revisá tu correo");
    expect(signUpEmail).toHaveBeenCalledWith(expect.objectContaining({ callbackURL: "/clases" }));
  });

  it("Continuar con Google vuelve al destino pedido", async () => {
    state.search = "next=%2Finvitacion%2Finv-1";
    renderWithProviders(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(signInWithGoogle).toHaveBeenCalledWith("/invitacion/inv-1");
  });

  it("si el registro falla avisa con el mensaje y vuelve a habilitar el formulario", async () => {
    signUpEmail.mockResolvedValue({ error: { message: "Ese email ya tiene cuenta" } });
    renderWithProviders(<RegisterForm />);
    await fillAndSubmit();
    const { toast } = await import("sonner");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ese email ya tiene cuenta"));
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("ignora un next externo", async () => {
    state.search = "next=https%3A%2F%2Fmalo.com";
    renderWithProviders(<RegisterForm />);
    await fillAndSubmit();
    await screen.findByText("Revisá tu correo");
    expect(signUpEmail).toHaveBeenCalledWith(expect.objectContaining({ callbackURL: "/" }));
  });

  it("un correo de otro dominio muestra el rechazo con los dominios aceptados", async () => {
    signUpEmail.mockResolvedValue({
      error: { message: "Solo se aceptan correos de frt.utn.edu.ar" },
    });
    renderWithProviders(<RegisterForm />);
    await fillAndSubmit();
    const { toast } = await import("sonner");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Solo se aceptan correos de frt.utn.edu.ar"),
    );
    expect(screen.queryByText("Revisá tu correo")).not.toBeInTheDocument();
  });
});
