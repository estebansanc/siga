"use client";

import type { MeDto } from "@repo/api/client";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { InfoIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLostOrganizationDismissal } from "@/hooks/use-lost-organization";
import { useMe } from "@/hooks/use-me";
import {
  readRedirectedLostOrganizationId,
  writeRedirectedLostOrganizationId,
} from "@/lib/lost-organization";

// El Administrador quitó al miembro mientras esa organización estaba activa: la sesión ya cayó
// sola a la propia (`GET /me` trae `lostOrganization`, ver `packages/auth/src/session.ts`);
// acá se hace explícito. La primera vez que se detecta —esté donde esté: si ya estaba en el
// inicio no hace falta navegar, si no lo estaba se navega ahí— se marca esa organización como
// ya aterrizada; las veces siguientes, aunque el servidor lo siga informando, ya no vuelve a
// navegar: el usuario queda libre de ir a cualquier otra pantalla y el aviso simplemente lo
// sigue.
export function LostOrganizationNotice({ me: initialMe }: { me: MeDto }) {
  const { data: me = initialMe } = useMe(initialMe);
  const pathname = usePathname();
  const router = useRouter();
  const [dismissedId, dismiss] = useLostOrganizationDismissal();
  const lostOrganization = me.lostOrganization;
  // La propia siempre está en `organizations`; solo falta acá en el instante en que `useMe`
  // todavía no trajo los datos completos.
  const currentOrganizationName = me.organizations.find(
    (organization) => organization.id === me.organizationId,
  )?.name;

  useEffect(() => {
    if (!lostOrganization) return;
    if (readRedirectedLostOrganizationId(window.localStorage) === lostOrganization.id) return;
    writeRedirectedLostOrganizationId(window.localStorage, lostOrganization.id);
    if (pathname !== "/") router.replace("/");
  }, [lostOrganization, pathname, router]);

  // El aviso, con el aterrizaje ya resuelto arriba, se muestra igual en cualquier pantalla.
  // `dismissedId` sale de `localStorage`, no llega en el HTML del servidor, así que la primera
  // pintura siempre lo muestra aunque ya estuviera cerrado en este dispositivo: un destello
  // aceptado.
  if (!lostOrganization || !currentOrganizationName || lostOrganization.id === dismissedId) {
    return null;
  }

  return (
    <div className="shrink-0 border-b p-2 sm:px-4">
      <Alert>
        <InfoIcon />
        <AlertTitle>Ya no tenés acceso a {lostOrganization.name}.</AlertTitle>
        <AlertDescription>Si creés que es un error, consultá en Bedelía.</AlertDescription>
        <AlertAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Ocultar"
            onClick={() => dismiss(lostOrganization.id)}
          >
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
