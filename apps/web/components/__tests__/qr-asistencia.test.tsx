import type { AulaGestionDto } from "@repo/api/client";
import { fechaArgentina } from "@repo/domain";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QrAsistencia } from "@/components/qr/qr-asistencia";
import { renderWithProviders } from "@/test/render";

vi.mock("@/components/qr/qr-en-vivo", () => ({
  QrEnVivo: ({ consulta }: { consulta: unknown }) => (
    <div data-testid="qr-en-vivo">{JSON.stringify(consulta)}</div>
  ),
}));

const aulas: AulaGestionDto[] = [
  {
    id: "a1",
    codigo: "Aula 12",
    edificio: "A",
    piso: "1",
    capacidad: 60,
    equipamiento: [],
    estado: "DISPONIBLE",
    ocupada: false,
    observaciones: null,
    activa: true,
  },
];

vi.mock("@/components/qr/registro-manual-dialog", () => ({
  RegistroManualDialog: () => <div data-testid="registro-manual" />,
}));

vi.mock("@/hooks/use-aulas", () => ({ useAulas: () => ({ data: aulas }) }));
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    data: {
      name: "UTN",
      turnos: {
        MANANA: { inicio: "07:00", fin: "13:00" },
        TARDE: { inicio: "13:00", fin: "18:00" },
        NOCHE: { inicio: "18:00", fin: "23:00" },
      },
    },
  }),
}));

describe("QrAsistencia", () => {
  it("ofrece los turnos con su rango y hoy preseleccionado", () => {
    renderWithProviders(<QrAsistencia />);
    expect(screen.getByRole("option", { name: "Mañana 7:00–13:00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tarde 13:00–18:00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Noche 18:00–23:00" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toHaveValue(fechaArgentina(new Date()));
  });

  it("exige elegir un aula antes de generar", async () => {
    renderWithProviders(<QrAsistencia />);
    await userEvent.click(screen.getByRole("button", { name: "Generar QR" }));
    expect(await screen.findByText("Elegí un aula")).toBeVisible();
    expect(screen.queryByTestId("qr-en-vivo")).not.toBeInTheDocument();
  });

  it("genera con el aula, el turno y la fecha elegidos", async () => {
    renderWithProviders(<QrAsistencia />);
    await userEvent.selectOptions(screen.getByLabelText("Aula"), "a1");
    await userEvent.selectOptions(screen.getByLabelText("Turno"), "NOCHE");
    await userEvent.click(screen.getByRole("button", { name: "Generar QR" }));
    expect(await screen.findByTestId("qr-en-vivo")).toHaveTextContent(
      JSON.stringify({ aulaId: "a1", turno: "NOCHE", fecha: fechaArgentina(new Date()) }),
    );
  });

  it("abre el registro manual sin depender del QR", async () => {
    renderWithProviders(<QrAsistencia />);
    expect(screen.queryByTestId("registro-manual")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registro manual" }));
    expect(screen.getByTestId("registro-manual")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-en-vivo")).not.toBeInTheDocument();
  });
});
