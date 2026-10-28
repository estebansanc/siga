import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DefinirContrasenaForm } from "@/components/auth/definir-contrasena-form";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const { definir, enlace, signOut, pushMock, state } = vi.hoisted(() => ({
  definir: vi.fn(),
  enlace: { state: { isError: false, isPending: false } },
  signOut: vi.fn(),
  pushMock: vi.fn(),
  state: { search: "token=tok-1" },
}));

vi.mock("@repo/auth/client", () => ({ authClient: { signOut } }));
vi.mock("@/hooks/use-recuperar-contrasena", () => ({
  useDefinirContrasena: () => ({
    mutate: (input: unknown, options: { onSuccess?: () => void; onError?: (e: Error) => void }) =>
      definir(input).then(options.onSuccess, options.onError),
    isPending: false,
  }),
  useEnlaceVigente: () => enlace.state,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));

const submit = async (contrasena: string, confirmacion: string) => {
  await userEvent.type(screen.getByLabelText("Nueva contraseña"), contrasena);
  await userEvent.type(screen.getByLabelText("Confirmar contraseña"), confirmacion);
  await userEvent.click(screen.getByRole("button", { name: "Definir contraseña" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.search = "token=tok-1";
  enlace.state = { isError: false, isPending: false };
  definir.mockResolvedValue({ ok: true });
  signOut.mockResolvedValue(undefined);
});

describe("DefinirContrasenaForm", () => {
  it("muestra la política antes de enviar", () => {
    renderWithProviders(<DefinirContrasenaForm />);
    expect(
      screen.getByText("Mínimo 8 caracteres, con al menos una letra y un número."),
    ).toBeInTheDocument();
  });

  it.each([
    ["a1", "La contraseña debe tener al menos 8 caracteres."],
    ["12345678", "La contraseña debe incluir al menos una letra."],
    ["abcdefgh", "La contraseña debe incluir al menos un número."],
  ])("con %s muestra el error junto al campo y no guarda", async (contrasena, mensaje) => {
    renderWithProviders(<DefinirContrasenaForm />);
    await submit(contrasena, contrasena);
    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(definir).not.toHaveBeenCalled();
  });

  it("una confirmación distinta marca la confirmación", async () => {
    renderWithProviders(<DefinirContrasenaForm />);
    await submit("nueva1234", "nueva12345");
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(definir).not.toHaveBeenCalled();
  });

  it("con datos válidos guarda y vuelve a /login con el aviso", async () => {
    renderWithProviders(<DefinirContrasenaForm />);
    await submit("nueva1234", "nueva1234");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login?contrasena=actualizada"));
    expect(definir).toHaveBeenCalledWith({
      token: "tok-1",
      contrasena: "nueva1234",
      confirmacion: "nueva1234",
    });
  });

  it("un enlace vencido ofrece pedir otro", async () => {
    definir.mockRejectedValue(new RequestError(400, "BAD_REQUEST", "x"));
    renderWithProviders(<DefinirContrasenaForm />);
    await submit("nueva1234", "nueva1234");
    expect(await screen.findByText("El enlace venció o ya fue usado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pedir otro enlace" }));
    expect(pushMock).toHaveBeenCalledWith("/recuperar-contrasena");
  });

  it("al abrir un enlace usado o vencido avisa sin pedir la contraseña", () => {
    enlace.state = { isError: true, isPending: false };
    renderWithProviders(<DefinirContrasenaForm />);
    expect(screen.getByText("El enlace venció o ya fue usado.")).toBeInTheDocument();
  });

  it("sin token muestra el enlace vencido", () => {
    state.search = "";
    renderWithProviders(<DefinirContrasenaForm />);
    expect(screen.getByText("El enlace venció o ya fue usado.")).toBeInTheDocument();
  });
});
