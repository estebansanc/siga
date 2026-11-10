import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/(auth)/login/page";

vi.mock("@repo/auth/client", () => ({ authClient: {}, signInWithGoogle: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/navigation", () => ({ navigateAfterSignIn: vi.fn() }));

const renderPage = async (params: Record<string, string | string[] | undefined>) =>
  render(await LoginPage({ searchParams: Promise.resolve(params) }));

describe("LoginPage", () => {
  it("renderiza el formulario en el servidor, sin esperar a leer la URL en el cliente", async () => {
    await renderPage({});
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });

  it("pasa next y el aviso de contraseña actualizada desde la URL", async () => {
    await renderPage({ next: "/solicitudes", contrasena: "actualizada" });
    expect(screen.getByText("Tu contraseña se actualizó")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute(
      "href",
      "/registro?next=%2Fsolicitudes",
    );
  });

  it("con un parámetro repetido se queda con el primero", async () => {
    await renderPage({ next: ["/solicitudes", "/otra"] });
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute(
      "href",
      "/registro?next=%2Fsolicitudes",
    );
  });

  it("ignora un next externo", async () => {
    await renderPage({ next: "//evil.com" });
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute("href", "/registro");
  });
});
