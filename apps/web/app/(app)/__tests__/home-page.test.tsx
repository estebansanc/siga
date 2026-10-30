import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);
const requireSession = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/session", () => ({ requireSession }));
vi.mock("@/components/clases/mis-clases-hoy", () => ({ MisClasesHoy: () => null }));
vi.mock("@/components/clases/mis-clases-docente", () => ({ MisClasesDocente: () => null }));

import HomePage from "../page";

describe("inicio por perfil", () => {
  beforeEach(() => redirect.mockClear());

  it.each([
    ["AUTORIDAD", "/clases"],
    ["BEDEL", "/estado-institucional"],
  ])("%s redirige a %s", async (perfil, destino) => {
    requireSession.mockResolvedValue({ perfil });
    await expect(HomePage()).rejects.toThrow(`REDIRECT:${destino}`);
  });

  it.each(["ESTUDIANTE", "DOCENTE"])("%s se queda en Mis clases", async (perfil) => {
    requireSession.mockResolvedValue({ perfil });
    await expect(HomePage()).resolves.toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
