import type { Ubicacion } from "@repo/domain";

const esperaMaximaMs = 3000;

// La ubicación se pide recién al escanear (ETI-3) y es opcional: sin permiso o sin señal el
// servidor valida por la red institucional. No se guarda en ningún lado del cliente.
export const leerUbicacion = () =>
  new Promise<Ubicacion | undefined>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitud: coords.latitude,
          longitud: coords.longitude,
          precisionMetros: coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: esperaMaximaMs, maximumAge: 10_000 },
    );
  });
