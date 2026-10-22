import { afterEach, describe, expect, it, vi } from "vitest";

import { leerUbicacion } from "@/lib/ubicacion";

const conGeolocalizacion = (geolocation: unknown) => vi.stubGlobal("navigator", { geolocation });

afterEach(() => vi.unstubAllGlobals());

describe("leerUbicacion", () => {
  it("devuelve coordenadas y precisión", async () => {
    conGeolocalizacion({
      getCurrentPosition: (ok: (posicion: unknown) => void) =>
        ok({ coords: { latitude: -26.8, longitude: -65.2, accuracy: 12 } }),
    });
    expect(await leerUbicacion()).toEqual({ latitud: -26.8, longitud: -65.2, precisionMetros: 12 });
  });

  it("sin permiso o sin señal devuelve undefined", async () => {
    conGeolocalizacion({
      getCurrentPosition: (_ok: unknown, error: () => void) => error(),
    });
    expect(await leerUbicacion()).toBeUndefined();
  });

  it("sin API de geolocalización devuelve undefined", async () => {
    conGeolocalizacion(undefined);
    expect(await leerUbicacion()).toBeUndefined();
  });
});
