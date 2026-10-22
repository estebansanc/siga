import { describe, expect, it, vi } from "vitest";

import { buscarCompresion, comprimirImagen } from "../comprimir-imagen";

const blobDe = (size: number) => new Blob([new Uint8Array(size)]);

describe("buscarCompresion", () => {
  it("baja la calidad y el tamaño hasta que entra en el límite", async () => {
    const renderizar = vi.fn((escala: number, calidad: number) =>
      Promise.resolve(blobDe(Math.round(4000 * escala * calidad))),
    );
    const resultado = await buscarCompresion(renderizar, 1000);
    expect(resultado.size).toBeLessThanOrEqual(1000);
    expect(renderizar.mock.calls[0]).toEqual([1, 0.85]);
    expect(renderizar.mock.calls.length).toBeGreaterThan(1);
  });

  it("se queda con el primer intento que entra", async () => {
    const renderizar = vi.fn(() => Promise.resolve(blobDe(10)));
    await buscarCompresion(renderizar, 1000);
    expect(renderizar).toHaveBeenCalledTimes(1);
  });

  it("falla cuando ninguna combinación entra", async () => {
    await expect(buscarCompresion(() => Promise.resolve(blobDe(5000)), 1000)).rejects.toThrow(
      "No se pudo comprimir la foto a 1 MB",
    );
  });
});

describe("comprimirImagen", () => {
  it("devuelve sin tocar una foto que ya pesa 1 MB o menos", async () => {
    const foto = new File([new Uint8Array(500)], "foto.png", { type: "image/png" });
    expect(await comprimirImagen(foto)).toBe(foto);
  });
});
