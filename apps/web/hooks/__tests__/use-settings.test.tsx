import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdateSettings } from "@/hooks/use-settings";
import { queryKeys } from "@/lib/query-keys";

const patch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  api: { settings: { $patch: patch } },
  unwrap: async (request: Promise<unknown>) => request,
}));

const setup = () => {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, ...renderHook(() => useUpdateSettings(), { wrapper }) };
};

const invalidatedKeys = (invalidate: ReturnType<typeof setup>["invalidate"]) =>
  invalidate.mock.calls.map(([filters]) => filters?.queryKey);

describe("useUpdateSettings", () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({ name: "Institución" });
  });

  it("al renombrar la institución invalida ajustes y quién-soy para refrescar la barra lateral", async () => {
    const { result, invalidate } = setup();
    await act(() => result.current.mutateAsync({ name: "Institución." }));
    expect(invalidatedKeys(invalidate)).toEqual([queryKeys.settings, queryKeys.me]);
  });

  it("al guardar otros ajustes no invalida quién-soy", async () => {
    const { result, invalidate } = setup();
    await act(() => result.current.mutateAsync({ radioMetros: 100 } as never));
    expect(invalidatedKeys(invalidate)).toEqual([queryKeys.settings]);
  });
});
