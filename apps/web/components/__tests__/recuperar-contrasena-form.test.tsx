import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecuperarContrasenaForm } from "@/components/auth/recuperar-contrasena-form";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const solicitar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-recuperar-contrasena", async () => {
  const { useState } = await import("react");
  return {
    useSolicitarRecuperacion: () => {
      const [error, setError] = useState<Error | null>(null);
      return {
        error,
        isPending: false,
        mutate: (input: unknown, options: { onSuccess?: () => void }) =>
          solicitar(input).then(options.onSuccess, setError),
      };
    },
  };
});

const submit = async () => {
  await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
  await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
};

beforeEach(() => vi.clearAllMocks());

describe("RecuperarContrasenaForm", () => {
  it("responde con el mensaje genérico", async () => {
    solicitar.mockResolvedValue({ ok: true });
    renderWithProviders(<RecuperarContrasenaForm />);
    await submit();
    expect(
      await screen.findByText("Si el correo está registrado, recibirás un enlace."),
    ).toBeInTheDocument();
    expect(solicitar).toHaveBeenCalledWith({ correo: "ana@example.com" });
  });

  it("pasado el límite muestra Demasiados intentos", async () => {
    solicitar.mockRejectedValue(
      new RequestError(
        429,
        "RATE_LIMITED",
        "Demasiados intentos. Esperá un momento y volvé a probar.",
      ),
    );
    renderWithProviders(<RecuperarContrasenaForm />);
    await submit();
    expect(
      await screen.findByText("Demasiados intentos. Esperá un momento y volvé a probar."),
    ).toBeInTheDocument();
  });

  it("un límite posterior reemplaza el mensaje de pedido enviado", async () => {
    solicitar.mockResolvedValueOnce({ ok: true });
    solicitar.mockRejectedValueOnce(
      new RequestError(
        429,
        "RATE_LIMITED",
        "Demasiados intentos. Esperá un momento y volvé a probar.",
      ),
    );
    renderWithProviders(<RecuperarContrasenaForm />);
    await submit();
    await screen.findByText("Si el correo está registrado, recibirás un enlace.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
    await screen.findByText("Demasiados intentos. Esperá un momento y volvé a probar.");
    expect(
      screen.queryByText("Si el correo está registrado, recibirás un enlace."),
    ).not.toBeInTheDocument();
  });
});
