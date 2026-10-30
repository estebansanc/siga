import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicarAvisoDialog } from "@/components/avisos/publicar-aviso-dialog";
import { renderWithProviders } from "@/test/render";

const publicar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-avisos", () => ({
  usePublicarAviso: () => ({ mutateAsync: publicar, isPending: false }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [{ id: "isi", codigo: "K", nombre: "Ingeniería en Sistemas" }] }),
  useComisiones: () => ({
    data: [{ id: "c1", codigo: "5K2", materia: { nombre: "Proyecto Final" } }],
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const manana = (): [string, string] => {
  const fecha = new Date(Date.now() + 24 * 60 * 60_000);
  const parte = (valor: number) => String(valor).padStart(2, "0");
  return [
    `${parte(fecha.getDate())}/${parte(fecha.getMonth() + 1)}/${fecha.getFullYear()}`,
    "10:00",
  ];
};

const cargarFechaHora = async (label: string, horaLabel: string, fecha: string, hora: string) => {
  const campoFecha = screen.getByLabelText(label);
  const campoHora = screen.getByLabelText(horaLabel);
  await userEvent.clear(campoFecha);
  await userEvent.type(campoFecha, fecha);
  await userEvent.clear(campoHora);
  await userEvent.type(campoHora, hora);
};

const publicarBoton = () => screen.getByRole("button", { name: "Publicar" });

beforeEach(() => {
  vi.clearAllMocks();
  publicar.mockResolvedValue({});
});

describe("PublicarAvisoDialog", () => {
  it("arranca con Todos marcado, prioridad Normal, desde ahora y sin correo", () => {
    renderWithProviders(<PublicarAvisoDialog onClose={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Todos" })).toBeChecked();
    expect(screen.getByLabelText("Prioridad")).toHaveValue("NORMAL");
    expect(screen.getByLabelText("Desde")).not.toHaveValue("");
    expect(screen.getByLabelText("Hasta")).toHaveValue("");
    expect(screen.getByRole("switch", { name: "Enviar por correo" })).not.toBeChecked();
    expect(screen.queryByText("Perfiles")).not.toBeInTheDocument();
  });

  it("publicar vacío muestra los errores de título, cuerpo y hasta, no de destinatario", async () => {
    renderWithProviders(<PublicarAvisoDialog onClose={vi.fn()} />);
    await userEvent.click(publicarBoton());
    expect(await screen.findByText("Ingresá el título")).toBeVisible();
    expect(screen.getByText("Ingresá el cuerpo del aviso")).toBeVisible();
    expect(screen.getByText("Indicá hasta cuándo está vigente")).toBeVisible();
    expect(screen.queryByText("Elegí al menos un destinatario")).not.toBeInTheDocument();
    expect(publicar).not.toHaveBeenCalled();
  });

  it("al desmarcar Todos aparecen los criterios y sin elegir ninguno pide un destinatario", async () => {
    renderWithProviders(<PublicarAvisoDialog onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Todos" }));
    expect(screen.getByRole("checkbox", { name: "Docente" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Ingeniería en Sistemas" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "5.º año" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Proyecto Final · 5K2" })).toBeInTheDocument();
    await userEvent.click(publicarBoton());
    expect(await screen.findByText("Elegí al menos un destinatario")).toBeVisible();
  });

  it("la vigencia que ya terminó se rechaza con el texto de futuro", async () => {
    renderWithProviders(<PublicarAvisoDialog onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Título"), "QA");
    await userEvent.type(screen.getByLabelText("Cuerpo"), "Prueba");
    await cargarFechaHora("Hasta", "Hora de fin", "01/01/2020", "10:00");
    await userEvent.click(publicarBoton());
    expect(await screen.findByText("La vigencia tiene que terminar en el futuro")).toBeVisible();
  });

  it("publica con los criterios elegidos, la vigencia en hora argentina y cierra", async () => {
    const onClose = vi.fn();
    renderWithProviders(<PublicarAvisoDialog onClose={onClose} />);
    await userEvent.type(screen.getByLabelText("Título"), "Corte de luz");
    await userEvent.type(screen.getByLabelText("Cuerpo"), "Hoy no hay clases");
    await userEvent.selectOptions(screen.getByLabelText("Prioridad"), "URGENTE");
    await userEvent.click(screen.getByRole("checkbox", { name: "Todos" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Bedel" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "5.º año" }));
    await cargarFechaHora("Hasta", "Hora de fin", ...manana());
    await userEvent.click(screen.getByRole("switch", { name: "Enviar por correo" }));
    await userEvent.click(publicarBoton());

    await waitFor(() => expect(publicar).toHaveBeenCalledTimes(1));
    expect(publicar.mock.calls[0][0]).toMatchObject({
      titulo: "Corte de luz",
      cuerpo: "Hoy no hay clases",
      prioridad: "URGENTE",
      destinatarios: { todos: false, perfiles: ["BEDEL"], anios: [5], carreraIds: [] },
      enviarPorCorreo: true,
    });
    expect(publicar.mock.calls[0][0].hasta).toMatch(/-03:00$/);
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Aviso publicado");
    expect(onClose).toHaveBeenCalled();
  });

  it("con un aviso precargado completa título, cuerpo, urgente y hasta", () => {
    renderWithProviders(
      <PublicarAvisoDialog
        precargado={{
          titulo: "Institución cerrada",
          cuerpo: "Corte de energía",
          prioridad: "URGENTE",
          hasta: "2026-10-14T22:30",
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Institución cerrada");
    expect(screen.getByLabelText("Cuerpo")).toHaveValue("Corte de energía");
    expect(screen.getByLabelText("Prioridad")).toHaveValue("URGENTE");
    expect(screen.getByLabelText("Hasta")).toHaveValue("14/10/2026");
    expect(screen.getByLabelText("Hora de fin")).toHaveValue("22:30");
    expect(screen.getByRole("checkbox", { name: "Todos" })).toBeChecked();
    expect(publicar).not.toHaveBeenCalled();
  });
});
