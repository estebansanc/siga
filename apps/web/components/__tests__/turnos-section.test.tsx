import { turnosIniciales, type Turnos } from "@repo/domain";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TurnosSection } from "@/components/settings/turnos-section";
import { renderWithProviders } from "@/test/render";

const update = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ turnos: undefined as Turnos | undefined }));

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ data: state.turnos ? { name: "UTN", turnos: state.turnos } : undefined }),
  useUpdateSettings: () => ({ mutateAsync: update, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  state.turnos = turnosIniciales;
  update.mockResolvedValue({});
});

const cambiarHora = async (label: string, valor: string) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, valor);
};

describe("TurnosSection", () => {
  it("muestra los rangos actuales y deshabilita Guardar sin cambios", () => {
    renderWithProviders(<TurnosSection />);
    expect(screen.getByLabelText("Noche: fin")).toHaveValue("23:30");
    expect(screen.getByLabelText("Mañana: inicio")).toHaveValue("07:00");
    expect(screen.getByRole("button", { name: "Guardar turnos" })).toBeDisabled();
  });

  it("guarda el cambio con los tres turnos", async () => {
    renderWithProviders(<TurnosSection />);
    await cambiarHora("Noche: fin", "23:00");
    await userEvent.click(screen.getByRole("button", { name: "Guardar turnos" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        turnos: { ...turnosIniciales, NOCHE: { inicio: "18:00", fin: "23:00" } },
      }),
    );
  });

  it("no guarda un turno que empieza antes de que termine el anterior", async () => {
    renderWithProviders(<TurnosSection />);
    await cambiarHora("Tarde: inicio", "12:00");
    await userEvent.click(screen.getByRole("button", { name: "Guardar turnos" }));
    expect(
      await screen.findByText("No puede empezar antes de que termine el turno anterior"),
    ).toBeVisible();
    expect(update).not.toHaveBeenCalled();
  });
});
