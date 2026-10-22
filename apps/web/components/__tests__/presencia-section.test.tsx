import { presenciaInicial, type Presencia } from "@repo/domain";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PresenciaSection } from "@/components/settings/presencia-section";
import { renderWithProviders } from "@/test/render";

const update = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ presencia: undefined as Presencia | undefined }));

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    data: state.presencia ? { name: "UTN", presencia: state.presencia } : undefined,
  }),
  useUpdateSettings: () => ({ mutateAsync: update, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  state.presencia = presenciaInicial;
  update.mockResolvedValue({});
});

const escribir = async (label: string, valor: string) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  if (valor) await userEvent.type(input, valor);
};

describe("PresenciaSection", () => {
  it("muestra un esqueleto mientras cargan los ajustes", () => {
    state.presencia = undefined;
    renderWithProviders(<PresenciaSection />);
    expect(screen.queryByLabelText("Radio (metros)")).not.toBeInTheDocument();
  });

  it("carga la sede, el radio y la red actuales y no guarda sin cambios", () => {
    state.presencia = { ...presenciaInicial, redes: ["10.0.0.0/8", "200.45.10.0/24"] };
    renderWithProviders(<PresenciaSection />);

    expect(screen.getByLabelText("Latitud")).toHaveValue(presenciaInicial.latitud);
    expect(screen.getByLabelText("Radio (metros)")).toHaveValue(200);
    expect(screen.getByLabelText("Red institucional")).toHaveValue("10.0.0.0/8\n200.45.10.0/24");
    expect(screen.getByRole("button", { name: /Guardar presencia/ })).toBeDisabled();
  });

  it("guarda ubicación, radio y redes", async () => {
    renderWithProviders(<PresenciaSection />);

    await escribir("Radio (metros)", "150");
    await userEvent.type(screen.getByLabelText("Red institucional"), "200.45.10.0/24");
    await userEvent.click(screen.getByRole("button", { name: /Guardar presencia/ }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        presencia: { ...presenciaInicial, radioMetros: 150, redes: ["200.45.10.0/24"] },
      }),
    );
  });

  it("un radio inválido muestra el error y no guarda", async () => {
    renderWithProviders(<PresenciaSection />);

    await escribir("Radio (metros)", "0");
    await userEvent.click(screen.getByRole("button", { name: /Guardar presencia/ }));

    expect(
      await screen.findByText("El radio debe estar entre 1 y 5000 metros."),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("un radio vacío pide ingresarlo", async () => {
    renderWithProviders(<PresenciaSection />);
    await escribir("Radio (metros)", "");
    await userEvent.click(screen.getByRole("button", { name: /Guardar presencia/ }));
    expect(await screen.findByText("Ingresá el radio en metros.")).toBeInTheDocument();
  });

  it("una red mal escrita muestra el error de formato", async () => {
    renderWithProviders(<PresenciaSection />);

    await userEvent.type(screen.getByLabelText("Red institucional"), "200.45.10.0");
    await userEvent.click(screen.getByRole("button", { name: /Guardar presencia/ }));

    expect(await screen.findByText(/formato CIDR IPv4/)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("coordenadas fuera de rango no se guardan", async () => {
    renderWithProviders(<PresenciaSection />);
    await escribir("Latitud", "95");
    await userEvent.click(screen.getByRole("button", { name: /Guardar presencia/ }));
    expect(await screen.findByText("La latitud debe estar entre -90 y 90.")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });
});
