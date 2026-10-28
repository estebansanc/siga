import { isInternalRoute } from "@/components/auth/auth-routes";

export const politicaPath = "/politica-de-privacidad";

// Sin aceptar la política vigente, toda pantalla interna manda acá y conserva la ruta pedida.
export const politicaPathFor = (requestedPath: string) => {
  const destination =
    requestedPath === "/"
      ? politicaPath
      : `${politicaPath}?next=${encodeURIComponent(requestedPath)}`;
  return isInternalRoute(destination) ? destination : politicaPath;
};
