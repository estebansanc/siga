import type { IncidenciaDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportarIncidenciaDialog } from "@/components/incidencias/reportar-incidencia-dialog";
import { renderWithProviders } from "@/test/render";

const reportar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-aulas", () => ({
  useAulas: () => ({
    data: [{ id: "a12", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" }],
  }),
}));
vi.mock("@/hooks/use-incidencias", () => ({
  useReportarIncidencia: () => ({ mutateAsync: reportar, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const incidencia: IncidenciaDto = {
  id: "i1",
  aula: {
    id: "a12",
    codigo: "Aula 12",
    edificio: "Edificio A",
    piso: "1.º piso",
    estado: "DISPONIBLE",
  },
  elemento: "PROYECTOR",
  descripcion: "No enciende",
  gravedad: "IMPIDE_USO",
  estado: "ABIERTA",
  tieneFoto: false,
  createdAt: "2026-10-14T21:00:00.000Z",
  reportadaPor: { id: "u1", nombre: "Rosa Benítez" },
};

const user = userEvent.setup({ applyAccept: false });
const archivo = (nombre: string, tipo: string, bytes: number) =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

beforeEach(() => {
  vi.clearAllMocks();
  reportar.mockResolvedValue(incidencia);
});

describe("ReportarIncidenciaDialog", () => {
  it("sin elemento ni descripción muestra los errores bajo cada campo y no guarda", async () => {
    renderWithProviders(<ReportarIncidenciaDialog onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    await user.click(within(dialog).getByRole("button", { name: "Reportar" }));

    expect(await within(dialog).findByText("Elegí el elemento afectado")).toBeVisible();
    expect(within(dialog).getByText("Ingresá una descripción")).toBeVisible();
    expect(within(dialog).getByText("Elegí el aula")).toBeVisible();
    expect(reportar).not.toHaveBeenCalled();
  });

  it("muestra el error bajo la foto si no es JPG ni PNG o pesa más de 5 MB, y no guarda", async () => {
    renderWithProviders(
      <ReportarIncidenciaDialog aula={{ id: "a12", codigo: "Aula 12" }} onClose={vi.fn()} />,
    );
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    await user.selectOptions(within(dialog).getByLabelText("Elemento afectado"), "PROYECTOR");
    await user.type(within(dialog).getByLabelText("Descripción"), "No enciende");

    await user.upload(
      within(dialog).getByLabelText(/Foto/),
      archivo("plano.pdf", "application/pdf", 10),
    );
    expect(within(dialog).getByText("La foto debe ser JPG o PNG")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Reportar" }));
    expect(reportar).not.toHaveBeenCalled();

    await user.upload(
      within(dialog).getByLabelText(/Foto/),
      archivo("grande.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    );
    expect(within(dialog).getByText("La foto no puede superar los 5 MB")).toBeVisible();
    expect(within(dialog).queryByText("La foto debe ser JPG o PNG")).toBeNull();
  });

  it("reporta desde un aula con la clase, la gravedad elegida y la foto", async () => {
    const onClose = vi.fn();
    const onReportada = vi.fn();
    renderWithProviders(
      <ReportarIncidenciaDialog
        aula={{ id: "a12", codigo: "Aula 12" }}
        claseId="c1"
        onClose={onClose}
        onReportada={onReportada}
      />,
    );
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    expect(within(dialog).queryByLabelText("Aula")).toBeNull();
    await user.selectOptions(within(dialog).getByLabelText("Elemento afectado"), "PROYECTOR");
    await user.type(within(dialog).getByLabelText("Descripción"), "No enciende");
    await user.click(within(dialog).getByRole("radio", { name: "Impide el uso del aula" }));
    const foto = archivo("foto.jpg", "image/jpeg", 1000);
    await user.upload(within(dialog).getByLabelText(/Foto/), foto);
    await user.click(within(dialog).getByRole("button", { name: "Reportar" }));

    await waitFor(() => expect(reportar).toHaveBeenCalled());
    expect(reportar).toHaveBeenCalledWith({
      input: expect.objectContaining({
        aulaId: "a12",
        claseId: "c1",
        elemento: "PROYECTOR",
        descripcion: "No enciende",
        gravedad: "IMPIDE_USO",
      }),
      foto,
    });
    expect(onReportada).toHaveBeenCalledWith(incidencia);
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      onReportada.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("el Bedel elige el aula de la lista", async () => {
    renderWithProviders(<ReportarIncidenciaDialog onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    await user.selectOptions(within(dialog).getByLabelText("Aula"), "a12");
    await user.selectOptions(within(dialog).getByLabelText("Elemento afectado"), "OTRO");
    await user.type(within(dialog).getByLabelText("Descripción"), "Goteras");
    await user.click(within(dialog).getByRole("button", { name: "Reportar" }));

    await waitFor(() => expect(reportar).toHaveBeenCalled());
    expect(reportar.mock.calls[0]?.[0]).toMatchObject({
      input: { aulaId: "a12", gravedad: "LEVE" },
      foto: null,
    });
  });
});
