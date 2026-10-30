import { ProfileSection } from "@/components/profile/profile-section";
import { getMeCached } from "@/lib/me-cache";
import { requireSession } from "@/lib/session";

export default async function MiCuentaPerfilPage() {
  const session = await requireSession();
  const me = await getMeCached(session);

  return <ProfileSection initialMe={me} />;
}
