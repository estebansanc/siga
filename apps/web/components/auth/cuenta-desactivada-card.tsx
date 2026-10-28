"use client";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CuentaDesactivadaCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Tu cuenta está desactivada</CardTitle>
        <CardDescription>Consultá con Bedelía si creés que es un error.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="outline" disabled={signingOut} onClick={signOut}>
          {signingOut ? <Spinner /> : null}
          Cerrar sesión
        </Button>
      </CardContent>
    </Card>
  );
}
