import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BajaCorreoCard } from "@/components/preferencias/baja-correo-card";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const baja = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-baja-correo", () => ({
  useBajaCorreo: () => ({ mutateAsync: baja, isPending: false }),
}));

beforeEach(() => baja.mockReset());

describe("BajaCorreoCard", () => {
  it("da de baja al apretar el botón y confirma", async () => {
    baja.mockResolvedValue({ ok: true });
    renderWithProviders(<BajaCorreoCard token="abc.def" />);
    expect(baja).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Dejar de recibir/ }));
    expect(
      await screen.findByText(
        "Listo. Ya no vas a recibir novedades de clase por correo. Podés volver a activarlas desde Preferencias.",
      ),
    ).toBeInTheDocument();
    expect(baja).toHaveBeenCalledWith("abc.def");
  });

  it("con un enlace alterado muestra el error exacto", async () => {
    baja.mockRejectedValueOnce(new RequestError(400, "BAD_REQUEST", "x"));
    renderWithProviders(<BajaCorreoCard token="alterado" />);
    await userEvent.click(screen.getByRole("button", { name: /Dejar de recibir/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El enlace para dejar de recibir correos no es válido.",
    );
  });

  it("sin token muestra el error y no ofrece el botón", () => {
    renderWithProviders(<BajaCorreoCard token="" />);
    expect(
      screen.getByText("El enlace para dejar de recibir correos no es válido."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
