import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";
import { renderWithProviders } from "@/test/render";

const { signInEmail, sendVerificationEmail, signInWithGoogle, pushMock, state } = vi.hoisted(
  () => ({
    signInEmail: vi.fn(),
    sendVerificationEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    pushMock: vi.fn(),
    state: { search: "" },
  }),
);

vi.mock("@repo/auth/client", () => ({
  authClient: { signIn: { email: signInEmail }, sendVerificationEmail },
  signInWithGoogle,
}));

vi.mock("@/lib/navigation", () => ({ navigateAfterSignIn: pushMock }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByLabelText("Email"), "demo@example.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "secret123");
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.search = "";
  signInWithGoogle.mockResolvedValue(undefined);
});

describe("LoginForm", () => {
  it("tras ingresar bien va al inicio y el botón sigue deshabilitado con spinner mientras navega", async () => {
    signInEmail.mockResolvedValue({ error: null });
    renderWithProviders(<LoginForm />);
    await fillAndSubmit();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    const submit = screen.getByRole("button", { name: /Ingresar/ });
    expect(submit).toBeDisabled();
    expect(within(submit).getByRole("status")).toBeInTheDocument();
  });

  it("respeta next al ingresar y en el link a Registrate", async () => {
    signInEmail.mockResolvedValue({ error: null });
    state.search = "next=%2Finvitacion%2Finv-1";
    renderWithProviders(<LoginForm />);
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute(
      "href",
      "/registro?next=%2Finvitacion%2Finv-1",
    );
    await fillAndSubmit();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/invitacion/inv-1"));
  });

  it("el pie aclara que Registrate es para estudiantes y que el personal no es un link", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByText(/¿Sos estudiante\?/)).toBeInTheDocument();
    expect(screen.queryByText(/¿No tenés cuenta\?/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute("href", "/registro");
    const staffNote = screen.getByText("Docentes y personal: tu acceso lo crea Bedelía");
    expect(staffNote.closest("a")).toBeNull();
  });

  it("si las credenciales fallan, vuelve a habilitar el formulario y avisa", async () => {
    signInEmail.mockResolvedValue({ error: { message: "invalid" } });
    renderWithProviders(<LoginForm />);
    await fillAndSubmit();
    const { toast } = await import("sonner");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Email o contraseña incorrectos"));
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("Continuar con Google deshabilita ambos botones con spinner mientras redirige", async () => {
    renderWithProviders(<LoginForm />);
    const google = screen.getByRole("button", { name: "Continuar con Google" });
    await userEvent.click(google);
    expect(signInWithGoogle).toHaveBeenCalledWith("/");
    expect(google).toBeDisabled();
    expect(within(google).getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ingresar/ })).toBeDisabled();
  });

  it("sin verificar el correo lo indica y permite reenviar el enlace", async () => {
    signInEmail.mockResolvedValue({ error: { code: "EMAIL_NOT_VERIFIED" } });
    sendVerificationEmail.mockResolvedValue({ error: null });
    renderWithProviders(<LoginForm />);
    await fillAndSubmit();
    expect(await screen.findByText("Verificá tu correo para ingresar")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Reenviar enlace" }));
    await waitFor(() =>
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        email: "demo@example.com",
        callbackURL: "/",
      }),
    );
  });

  it("una cuenta desactivada ve el motivo en vez de credenciales incorrectas", async () => {
    signInEmail.mockResolvedValue({
      error: { code: "ACCOUNT_DEACTIVATED", message: "Tu cuenta está desactivada" },
    });
    renderWithProviders(<LoginForm />);
    await fillAndSubmit();
    const { toast } = await import("sonner");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Tu cuenta está desactivada"));
  });

  it("una cuenta bloqueada ve el mensaje con la hora de liberación", async () => {
    const message = "Cuenta bloqueada temporalmente. Podés volver a intentar a las 18:05.";
    signInEmail.mockResolvedValue({ error: { code: "ACCOUNT_LOCKED", message } });
    renderWithProviders(<LoginForm />);
    await fillAndSubmit();
    const { toast } = await import("sonner");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
  });

  it("ofrece recuperar la contraseña", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
      "href",
      "/recuperar-contrasena",
    );
  });

  it("tras definir una contraseña nueva avisa que se actualizó", () => {
    state.search = "contrasena=actualizada";
    renderWithProviders(<LoginForm />);
    expect(screen.getByText("Tu contraseña se actualizó")).toBeInTheDocument();
  });
});
