import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { ShieldAlertIcon } from "lucide-react";

export function AccesoDenegado() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Acceso denegado</EmptyTitle>
        <EmptyDescription>Tu perfil no tiene permiso para ver esta sección.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
