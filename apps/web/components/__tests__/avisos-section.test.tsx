import type { AvisoDto, NotificacionAvisoDto } from "@repo/api/client";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvisosSection } from "@/components/avisos/avisos-section";
import { renderWithProviders } from "@/test/render";

type EstadoDelTest = {
  avisos: Record<string, AvisoDto[]>;
  notificaciones: NotificacionAvisoDto[];
  search: string;
};
const state = vi.hoisted((): EstadoDelTest => ({ avisos: {}, notificaciones: [], search: "" }));

vi.mock("@/hooks/use-avisos", () => ({
  useAvisos: (vista: string) => ({ data: state.avisos[vista] }),
  useNotificacionesAviso: () => ({ data: state.notificaciones }),
  usePublicarAviso: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [] }),
  useComisiones: () => ({ data: [] }),
}));
const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  useRouter: () => ({ replace }),
}));

const aviso = (parcial: Partial<AvisoDto>): AvisoDto => ({
  id: "a1",
  titulo: "Aviso",
  cuerpo: "Cuerpo",
  prioridad: "NORMAL",
  destinatarios: { todos: true, perfiles: [], carreraIds: [], anios: [], comisionIds: [] },
  desde: "2026-10-21T15:00:00.000Z",
  hasta: "2026-10-22T15:00:00.000Z",
  enviarPorCorreo: false,
  publicadoPor: { id: "u1", nombre: "Rosa Benítez" },
  createdAt: "2026-10-21T15:00:00.000Z",
  ...parcial,
});

beforeEach(() => {
  replace.mockClear();
  state.search = "";
  state.notificaciones = [];
  state.avisos = {
    VIGENTES: [
      aviso({ id: "u", titulo: "QA urgente", prioridad: "URGENTE", enviarPorCorreo: true }),
    ],
    HISTORIAL: [aviso({ id: "h", titulo: "Aviso viejo" })],
    PUBLICADOS: [
      aviso({ id: "u", titulo: "QA urgente", prioridad: "URGENTE", enviarPorCorreo: true }),
    ],
  };
});

describe("AvisosSection", () => {
  it("quien no publica ve Vigentes e Historial, sin Nuevo aviso ni Publicados", async () => {
    renderWithProviders(<AvisosSection puedePublicar={false} />);
    expect(screen.getByRole("tab", { name: "Vigentes" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Publicados" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo aviso" })).not.toBeInTheDocument();
    expect(screen.getByText("QA urgente")).toBeInTheDocument();
    expect(screen.getByText("Urgente")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Historial" }));
    expect(screen.getByText("Aviso viejo")).toBeInTheDocument();
    expect(screen.queryByText("QA urgente")).not.toBeInTheDocument();
  });

  it("quien publica ve Publicados con Resultado de envíos por destinatario", async () => {
    state.notificaciones = [
      {
        id: "n1",
        destinatario: { id: "u1", nombre: "Rosa Benítez", email: "demo@example.com" },
        estado: "PENDING",
      },
      {
        id: "n2",
        destinatario: { id: "u2", nombre: "Lucía Gómez", email: "estudiante@example.com" },
        estado: "FAILED",
      },
    ];
    renderWithProviders(<AvisosSection puedePublicar />);
    await userEvent.click(screen.getByRole("tab", { name: "Publicados" }));
    expect(screen.getByText("Urgente")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resultado de envíos" }));
    const dialog = await screen.findByRole("dialog", { name: "Resultado de envíos" });
    expect(within(dialog).getByText("demo@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("Pendiente")).toBeInTheDocument();
    expect(within(dialog).getByText("Fallido")).toBeInTheDocument();
  });

  it("Nuevo aviso abre el diálogo", async () => {
    renderWithProviders(<AvisosSection puedePublicar />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo aviso" }));
    expect(await screen.findByRole("dialog", { name: "Nuevo aviso" })).toBeInTheDocument();
  });

  it("llegando desde el cierre abre 'Nuevo aviso' precargado, sin publicar", async () => {
    state.search = "estado=CERRADA&motivo=Corte+de+energ%C3%ADa";
    renderWithProviders(<AvisosSection puedePublicar />);
    const dialog = await screen.findByRole("dialog", { name: "Nuevo aviso" });
    expect(within(dialog).getByLabelText("Título")).toHaveValue("Institución cerrada");
    expect(within(dialog).getByLabelText("Cuerpo")).toHaveValue("Corte de energía");
    expect(within(dialog).getByLabelText("Prioridad")).toHaveValue("URGENTE");
    expect(replace).toHaveBeenCalledWith("/avisos");
  });

  it("sin avisos muestra el vacío de la vista", () => {
    state.avisos.VIGENTES = [];
    renderWithProviders(<AvisosSection puedePublicar={false} />);
    expect(screen.getByText("No hay avisos vigentes.")).toBeInTheDocument();
  });
});
