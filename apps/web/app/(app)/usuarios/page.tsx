import type { Metadata } from "next";

import { Proximamente } from "@/components/layout/proximamente";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Page() {
  await requireSession();
  return <Proximamente title="Usuarios" description="Administración de usuarios y perfiles." />;
}
