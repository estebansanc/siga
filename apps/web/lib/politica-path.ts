import type { Route } from "next";

export const politicaPath = "/politica-de-privacidad";

// Sin aceptar la política vigente, toda pantalla interna manda acá y conserva la ruta pedida.
export const politicaPathFor = (requestedPath: string): Route => {
  const destination = `${politicaPath}${requestedPath === "/" ? "" : `?next=${encodeURIComponent(requestedPath)}`}`;
  return destination as Route;
};
