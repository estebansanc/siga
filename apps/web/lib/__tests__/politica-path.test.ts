import { describe, expect, it } from "vitest";

import { politicaPathFor } from "@/lib/politica-path";

describe("politicaPathFor", () => {
  it("conserva la ruta pedida", () => {
    expect(politicaPathFor("/novedades?x=1")).toBe(
      "/politica-de-privacidad?next=%2Fnovedades%3Fx%3D1",
    );
  });

  it("el inicio no necesita ruta de retorno", () => {
    expect(politicaPathFor("/")).toBe("/politica-de-privacidad");
  });
});
