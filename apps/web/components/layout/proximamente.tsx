import { buttonVariants } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { ConstructionIcon } from "lucide-react";
import Link from "next/link";

import { PageBody } from "./page-body";
import { PageHeader } from "./page-header";

// Las secciones del producto que todavía no entraron en esta versión existen igual en el
// menú de cada perfil, para que la navegación sea la del producto completo.
export function Proximamente({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <div className="mx-auto flex w-full max-w-3xl flex-col p-4">
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ConstructionIcon />
              </EmptyMedia>
              <EmptyTitle>Próximamente</EmptyTitle>
              <EmptyDescription>
                {description} Esta sección llega en una próxima versión de SiGA.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Volver al inicio
              </Link>
            </EmptyContent>
          </Empty>
        </div>
      </PageBody>
    </>
  );
}
