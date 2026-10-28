import type { MemberDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembersSection } from "@/components/settings/members-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  members: undefined as MemberDto[] | undefined,
}));

const mutations = vi.hoisted(() => ({
  remove: vi.fn(),
}));

vi.mock("@/hooks/use-members", () => ({
  useMembers: () => ({ data: state.members, isPending: state.members === undefined }),
  useRemoveMember: () => ({ mutateAsync: mutations.remove, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const owner: MemberDto = {
  id: "m1",
  userId: "u1",
  name: "Ana Admin",
  email: "ana@example.com",
  role: "owner",
  createdAt: "2026-10-01T00:00:00.000Z",
};

const member: MemberDto = {
  id: "m2",
  userId: "u2",
  name: "Beto Miembro",
  email: "beto@example.com",
  role: "member",
  createdAt: "2026-10-02T00:00:00.000Z",
};

const render = () => renderWithProviders(<MembersSection currentUserId="u1" />);

const itemOf = (text: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="item"]')].find((item) =>
    item.textContent?.includes(text),
  ) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  state.members = [owner, member];
  mutations.remove.mockResolvedValue({ ok: true });
});

describe("MembersSection", () => {
  it("muestra esqueletos mientras cargan los miembros", () => {
    state.members = undefined;
    render();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Ana Admin")).not.toBeInTheDocument();
  });

  it("lista miembros con rol; el Administrador no tiene acciones", () => {
    render();
    const ownerItem = itemOf("Ana Admin");
    expect(within(ownerItem).getByText("Administrador")).toBeInTheDocument();
    expect(within(ownerItem).getByText("(vos)")).toBeInTheDocument();
    expect(within(ownerItem).queryByRole("button")).not.toBeInTheDocument();
    const memberItem = itemOf("Beto Miembro");
    expect(within(memberItem).getByText("Miembro")).toBeInTheDocument();
    expect(
      within(memberItem).getByRole("button", { name: "Acciones de Beto Miembro" }),
    ).toBeInTheDocument();
  });

  it("quitar un miembro pide confirmación y llama a la API con su usuario", async () => {
    render();
    await userEvent.click(screen.getByRole("button", { name: "Acciones de Beto Miembro" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Quitar de la organización" }),
    );
    const alert = await screen.findByRole("alertdialog", { name: "¿Quitar a Beto Miembro?" });
    await userEvent.click(within(alert).getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(mutations.remove).toHaveBeenCalledWith("u2"));
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Miembro quitado");
  });
});
