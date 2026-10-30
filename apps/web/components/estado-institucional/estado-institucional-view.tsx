import { CambiarEstadoForm } from "./cambiar-estado-form";
import { EstadoActualCard } from "./estado-actual-card";
import { HistorialTable } from "./historial-table";

export function EstadoInstitucionalView({ puedeCambiar }: { puedeCambiar: boolean }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-4">
        <EstadoActualCard />
        {puedeCambiar ? <CambiarEstadoForm /> : null}
      </div>
      <HistorialTable />
    </div>
  );
}
