import { NotificacionesSection } from "@/components/mi-cuenta/notificaciones-section";
import { requireSession } from "@/lib/session";

export default async function MiCuentaNotificacionesPage() {
  const session = await requireSession();

  return <NotificacionesSection esEstudiante={session.perfil === "ESTUDIANTE"} />;
}
