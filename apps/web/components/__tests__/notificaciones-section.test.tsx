import type { PreferenciasDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificacionesSection } from "@/components/mi-cuenta/notificaciones-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ preferencias: undefined as PreferenciasDto | undefined }));
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-preferencias", () => ({
  usePreferencias: () => ({ data: state.preferencias }),
  useActualizarPreferencias: () => ({ mutateAsync: actualizar, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  actualizar.mockReset().mockResolvedValue(undefined);
  state.preferencias = {
    comisiones: [],
    notificarNovedadesPorCorreo: false,
    notificarAvisosPorCorreo: false,
  };
});

describe("NotificacionesSection", () => {
  it("arranca desactivado y Guardar espera un cambio", () => {
    renderWithProviders(<NotificacionesSection esEstudiante />);
    expect(screen.getByRole("switch", { name: "Recibir novedades por correo" })).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Recibir avisos institucionales por correo" }),
    ).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeDisabled();
  });

  it("guarda cada opción sin mandar las comisiones", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificacionesSection esEstudiante />);
    await user.click(screen.getByRole("switch", { name: "Recibir novedades por correo" }));
    await user.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith({
        notificarNovedadesPorCorreo: true,
        notificarAvisosPorCorreo: false,
      }),
    );
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
});
