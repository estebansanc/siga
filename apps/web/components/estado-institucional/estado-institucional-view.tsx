import { CambiarEstadoForm } from "./cambiar-estado-form";
import { EstadoActualCard } from "./estado-actual-card";
import { HistorialTable } from "./historial-table";

export function EstadoInstitucionalView({ puedeCambiar }: { puedeCambiar: boolean }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <EstadoActualCard />
        {puedeCambiar ? <CambiarEstadoForm /> : null}
      </div>
      <HistorialTable />
    </div>
  );
}
