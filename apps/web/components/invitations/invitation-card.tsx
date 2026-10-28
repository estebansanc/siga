"use client";

import type { InvitationDto } from "@repo/api/client";
import { authClient } from "@repo/auth/client";
import type { InvitationStatus } from "@repo/domain";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAcceptInvitation, useInvitation, useRejectInvitation } from "@/hooks/use-invitation";
import { RequestError } from "@/lib/api-client";
import { showRequestError } from "@/lib/form-errors";

const resolvedMessages: Record<Exclude<InvitationStatus, "PENDING">, string> = {
  EXPIRED: "Esta invitación venció. Pedile al Administrador de la organización que te la reenvíe.",
  CANCELED: "Esta invitación fue cancelada por la organización.",
  ACCEPTED: "Esta invitación ya fue aceptada.",
  REJECTED: "Esta invitación ya fue rechazada.",
};

function GoHome() {
  return (
    <Link href="/" className={buttonVariants({ variant: "outline" })}>
      Ir al inicio
    </Link>
  );
}

function UnavailableInvitation({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Invitación no disponible</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <GoHome />
      </CardFooter>
    </Card>
  );
}

function WrongAccount({ id, userEmail }: { id: string; userEmail: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    queryClient.clear();
    router.push(`/login?next=${encodeURIComponent(`/invitacion/${id}`)}`);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Esta invitación es para otro email</CardTitle>
        <CardDescription>
          Estás con {userEmail}. Cerrá sesión e ingresá o registrate con el email al que llegó la
          invitación.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-wrap justify-center gap-2">
        <GoHome />
        <Button disabled={signingOut} onClick={signOut}>
          {signingOut ? <Spinner /> : null}
          Cerrar sesión
        </Button>
      </CardFooter>
    </Card>
  );
}

function PendingInvitation({ invitation }: { invitation: InvitationDto }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const reject = useRejectInvitation();
  const busy = accept.isPending || reject.isPending;

  const resolve = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      router.push("/");
      router.refresh();
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{invitation.organizationName}</CardTitle>
        <CardDescription>
          Te invitaron a unirte como miembro. Al aceptar, tu cuenta queda como miembro de esa
          organización.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-center text-sm">
        Tu organización propia sigue siendo la misma; podés salir cuando quieras.
      </CardContent>
      <CardFooter className="flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => resolve(() => reject.mutateAsync(invitation.id), "Invitación rechazada")}
        >
          {reject.isPending ? <Spinner /> : null}
          Rechazar
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            resolve(
              () => accept.mutateAsync(invitation.id),
              `Te uniste a ${invitation.organizationName}`,
            )
          }
        >
          {accept.isPending ? <Spinner /> : null}
          Aceptar
        </Button>
      </CardFooter>
    </Card>
  );
}

export function InvitationCard({ id, userEmail }: { id: string; userEmail: string }) {
  const invitation = useInvitation(id);

  if (invitation.isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </CardHeader>
        <CardFooter className="justify-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }
  if (invitation.isError) {
    const message =
      invitation.error instanceof RequestError && invitation.error.status === 404
        ? "Esta invitación no existe o el link está incompleto."
        : "No pudimos leer la invitación. Probá de nuevo en un momento.";
    return <UnavailableInvitation message={message} />;
  }
  if (invitation.data.status !== "PENDING") {
    return <UnavailableInvitation message={resolvedMessages[invitation.data.status]} />;
  }
  if (!invitation.data.forCurrentUser) return <WrongAccount id={id} userEmail={userEmail} />;
  return <PendingInvitation invitation={invitation.data} />;
}
