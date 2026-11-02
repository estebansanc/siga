import type { PreferenciasDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificacionesSection } from "@/components/mi-cuenta/notificaciones-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  preferencias: undefined as PreferenciasDto | undefined,
  pendiente: false,
}));
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-preferencias", () => ({
  usePreferencias: () => ({ data: state.preferencias }),
  useActualizarPreferencias: () => ({ mutateAsync: actualizar, isPending: state.pendiente }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => {
  actualizar.mockReset().mockResolvedValue(undefined);
  toast.success.mockReset();
  toast.error.mockReset();
  state.pendiente = false;
  state.preferencias = {
    comisiones: [],
    notificarNovedadesPorCorreo: false,
    notificarAvisosPorCorreo: false,
  };
});

describe("NotificacionesSection", () => {
  it("arranca desactivado y no tiene Guardar", () => {
    renderWithProviders(<NotificacionesSection esEstudiante />);
    expect(screen.getByRole("switch", { name: "Recibir novedades por correo" })).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    ).not.toBeChecked();
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });

  it("guarda al cambiar cada opción, sin mandar las comisiones, con su toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificacionesSection esEstudiante />);
    await user.click(screen.getByRole("switch", { name: "Recibir novedades por correo" }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith({ notificarNovedadesPorCorreo: true }),
    );
    expect(toast.success).toHaveBeenCalledWith("Vas a recibir novedades por correo");
    await user.click(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    );
    await waitFor(() =>
      expect(actualizar).toHaveBeenLastCalledWith({ notificarAvisosPorCorreo: true }),
    );
    expect(toast.success).toHaveBeenLastCalledWith(
      "Vas a recibir avisos institucionales por correo",
    );
  });

  it("al desactivar avisa que ya no va a recibir", async () => {
    state.preferencias = { ...state.preferencias!, notificarNovedadesPorCorreo: true };
    const user = userEvent.setup();
    renderWithProviders(<NotificacionesSection esEstudiante />);
    await user.click(screen.getByRole("switch", { name: "Recibir novedades por correo" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Ya no vas a recibir novedades por correo"),
    );
  });

  it("mientras guarda bloquea los interruptores", () => {
    state.pendiente = true;
    renderWithProviders(<NotificacionesSection esEstudiante />);
    expect(screen.getByRole("switch", { name: "Recibir novedades por correo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("si falla vuelve a lo guardado y muestra el error", async () => {
    actualizar.mockRejectedValue(new Error("sin red"));
    const user = userEvent.setup();
    renderWithProviders(<NotificacionesSection esEstudiante />);
    await user.click(screen.getByRole("switch", { name: "Recibir novedades por correo" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ocurrió un error inesperado"));
    expect(screen.getByRole("switch", { name: "Recibir novedades por correo" })).not.toBeChecked();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("refleja lo guardado", () => {
    state.preferencias = { ...state.preferencias!, notificarAvisosPorCorreo: true };
    renderWithProviders(<NotificacionesSection esEstudiante />);
    expect(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    ).toBeChecked();
  });

  it("los demás perfiles ven un texto informativo sin interruptores", () => {
    renderWithProviders(<NotificacionesSection esEstudiante={false} />);
    expect(screen.getByText(/Recibís siempre por correo los avisos que te alcanzan/)).toBeVisible();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });

  it("mientras guarda, el interruptor activo muestra un spinner y ambos se bloquean", async () => {
    actualizar.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderWithProviders(<NotificacionesSection esEstudiante />);
    await user.click(screen.getByRole("switch", { name: "Recibir novedades por correo" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
