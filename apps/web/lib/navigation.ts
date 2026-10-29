// Tras iniciar sesión se navega con una carga completa: así la sesión nueva llega a todas las
// capas del servidor y, si el layout autenticado redirige (por ejemplo a la política de
// privacidad pendiente), la pantalla destino se arma completa y no queda en blanco.
export const navigateAfterSignIn = (route: string) => {
  window.location.assign(route);
};
