import type { MeDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileSection } from "@/components/profile/profile-section";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const updateProfile = vi.hoisted(() => vi.fn());
const solicitarBaja = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-me", () => ({
  useMe: (initialData: MeDto) => ({ data: initialData }),
  useUpdateProfile: () => ({ mutateAsync: updateProfile, isPending: false }),
  useSolicitarBaja: () => ({ mutateAsync: solicitarBaja, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const me: MeDto = {
  userId: "u1",
  userName: "Ana Demo",
  userEmail: "ana@example.com",
  dni: "30123456",
  legajo: "L-10",
  bajaSolicitadaEn: null,
  organizationId: "org-1",
  role: "owner",
  perfil: "BEDEL",
  organizations: [{ id: "org-1", name: "Organización de Ana", slug: "ana", role: "owner" }],
  politicaPendiente: false,
  lostOrganization: null,
};

const guardar = () => screen.getByRole("button", { name: "Guardar" });

beforeEach(() => {
  vi.clearAllMocks();
  updateProfile.mockResolvedValue({ ...me, userName: "Ana Pérez" });
  solicitarBaja.mockResolvedValue({ ...me, bajaSolicitadaEn: "2026-10-28T15:00:00.000Z" });
});

describe("ProfileSection", () => {
  it("muestra los datos, deja correo y perfil de solo lectura y arranca con Guardar deshabilitado", () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    expect(screen.getByLabelText("Apellido y nombre")).toHaveValue("Ana Demo");
    expect(screen.getByLabelText("DNI")).toHaveValue("30123456");
    expect(screen.getByLabelText("Legajo")).toHaveValue("L-10");
    expect(screen.getByLabelText("Correo")).toBeDisabled();
    expect(screen.getByLabelText("Perfil")).toHaveValue("Bedel");
    expect(screen.getByLabelText("Perfil")).toBeDisabled();
    expect(
      screen.getByText("Para cambiar el correo o el perfil, pedíselo a Bedelía."),
    ).toBeInTheDocument();
    expect(guardar()).toBeDisabled();
  });

  it("guarda nombre, DNI y legajo, avisa y vuelve a deshabilitar Guardar", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    const nombre = screen.getByLabelText("Apellido y nombre");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "  Pérez, Ana  ");
    await userEvent.clear(screen.getByLabelText("DNI"));
    await userEvent.type(screen.getByLabelText("DNI"), "30999888");
    await userEvent.click(guardar());
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        name: "Pérez, Ana",
        dni: "30999888",
        legajo: "L-10",
      }),
    );
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Perfil actualizado");
    await waitFor(() => expect(guardar()).toBeDisabled());
  });

  it("un apellido y nombre vacío muestra el error y no guarda", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    const nombre = screen.getByLabelText("Apellido y nombre");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "   ");
    await userEvent.click(guardar());
    expect(await screen.findByText("Ingresá apellido y nombre")).toBeVisible();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("quien ya tiene DNI no puede dejarlo vacío", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    await userEvent.clear(screen.getByLabelText("DNI"));
    await userEvent.click(guardar());
    expect(await screen.findByText("Ingresá tu DNI")).toBeVisible();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("un DNI sin 7 u 8 dígitos muestra el error debajo del campo y no guarda", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    const dni = screen.getByLabelText("DNI");
    await userEvent.clear(dni);
    await userEvent.type(dni, "123456");
    await userEvent.click(guardar());
    expect(await screen.findByText("El DNI debe tener 7 u 8 dígitos")).toBeVisible();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("un DNI de otra cuenta muestra el conflicto debajo del campo DNI", async () => {
    updateProfile.mockRejectedValue(
      new RequestError(409, "CONFLICT", "Ya existe un usuario con ese DNI", [
        { path: "dni", message: "Ya existe un usuario con ese DNI" },
      ]),
    );
    renderWithProviders(<ProfileSection initialMe={me} />);
    const dni = screen.getByLabelText("DNI");
    await userEvent.clear(dni);
    await userEvent.type(dni, "30999888");
    await userEvent.click(guardar());
    expect(await screen.findByText("Ya existe un usuario con ese DNI")).toBeVisible();
  });

  it("pide confirmación y manda el motivo al solicitar la baja", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    await userEvent.click(screen.getByRole("button", { name: "Solicitar baja de mi cuenta" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeVisible();
    await userEvent.type(screen.getByLabelText("Motivo (opcional)"), "Dejo la institución");
    await userEvent.click(screen.getByRole("button", { name: "Solicitar baja" }));
    await waitFor(() =>
      expect(solicitarBaja).toHaveBeenCalledWith({ motivo: "Dejo la institución" }),
    );
  });

  it("limita el motivo a 500 caracteres", async () => {
    renderWithProviders(<ProfileSection initialMe={me} />);
    await userEvent.click(screen.getByRole("button", { name: "Solicitar baja de mi cuenta" }));
    expect(await screen.findByLabelText("Motivo (opcional)")).toHaveAttribute("maxlength", "500");
  });

  it("con la baja solicitada muestra la fecha y no ofrece el botón", () => {
    renderWithProviders(
      <ProfileSection initialMe={{ ...me, bajaSolicitadaEn: "2026-10-28T15:00:00.000Z" }} />,
    );
    expect(screen.getByText("Baja solicitada el 28/10/2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Solicitar baja de mi cuenta" }),
    ).not.toBeInTheDocument();
  });
});
