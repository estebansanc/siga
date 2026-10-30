"use client";

import type {
  AulaDto,
  CarreraDto,
  CarreraGestionDto,
  ComisionDto,
  ComisionGestionDto,
  DiaNoLaborableGestionDto,
  DocenteAsignableDto,
  GeneracionClasesDto,
  HorarioGestionDto,
  MateriaDto,
  MateriaGestionDto,
  PeriodoGestionDto,
} from "@repo/api/client";
import type {
  ActualizarCarrera,
  ActualizarComision,
  ActualizarDiaNoLaborable,
  ActualizarHorario,
  ActualizarMateria,
  ActualizarPeriodo,
  CrearCarrera,
  CrearComisionInput,
  CrearDiaNoLaborable,
  CrearHorarioInput,
  CrearMateria,
  CrearPeriodo,
} from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type FiltroMaterias = { carreraId?: string; anio?: string };
type FiltroComisiones = FiltroMaterias & { materiaId?: string };

const compactar = <T extends Record<string, string | undefined>>(query: T) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value)) as T;

export const useCarreras = () =>
  useQuery({
    queryKey: queryKeys.carreras,
    queryFn: () => unwrap<CarreraDto[]>(api.carreras.$get()),
    staleTime: 5 * 60_000,
  });

export const useMaterias = (filtro: FiltroMaterias) => {
  const query = compactar(filtro);
  return useQuery({
    queryKey: queryKeys.materias(query),
    queryFn: () => unwrap<MateriaDto[]>(api.materias.$get({ query })),
    staleTime: 5 * 60_000,
  });
};

export const useComisiones = (filtro: FiltroComisiones, enabled = true) => {
  const query = compactar(filtro);
  return useQuery({
    queryKey: queryKeys.comisiones(query),
    queryFn: () => unwrap<ComisionDto[]>(api.comisiones.$get({ query })),
    enabled,
    staleTime: 5 * 60_000,
  });
};

// ---------- Administración (RF-13) ----------

type Edicion<T> = { id: string; input: T };

// Lo que se carga acá alimenta Clases, Preferencias y las clases generadas.
const useInvalidarDatosAcademicos = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["datos-academicos", "carreras", "materias", "comisiones", "clases", "preferencias"].map(
        (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
};

const useAccion = <TVariables, TDto>(accion: (variables: TVariables) => Promise<TDto>) => {
  const invalidar = useInvalidarDatosAcademicos();
  return useMutation({ mutationFn: accion, onSuccess: invalidar });
};

const useListado = <T>(entidad: string, query: object, load: () => Promise<T[]>) =>
  useQuery({ queryKey: queryKeys.datosAcademicos(entidad, query), queryFn: load });

const consultaBajas = (bajas: boolean) => ({
  bajas: bajas ? ("true" as const) : ("false" as const),
});

export const useCarrerasGestion = (bajas: boolean) =>
  useListado("carreras", { bajas }, () =>
    unwrap<CarreraGestionDto[]>(api.carreras.gestion.$get({ query: consultaBajas(bajas) })),
  );
export const useCrearCarrera = () =>
  useAccion((input: CrearCarrera) =>
    unwrap<CarreraGestionDto>(api.carreras.$post({ json: input })),
  );
export const useActualizarCarrera = () =>
  useAccion(({ id, input }: Edicion<ActualizarCarrera>) =>
    unwrap<CarreraGestionDto>(api.carreras[":id"].$patch({ param: { id }, json: input })),
  );
export const useDarDeBajaCarrera = () =>
  useAccion((id: string) =>
    unwrap<CarreraGestionDto>(api.carreras[":id"].baja.$post({ param: { id } })),
  );
export const useReactivarCarrera = () =>
  useAccion((id: string) =>
    unwrap<CarreraGestionDto>(api.carreras[":id"].reactivar.$post({ param: { id } })),
  );

export const useMateriasGestion = (bajas: boolean) =>
  useListado("materias", { bajas }, () =>
    unwrap<MateriaGestionDto[]>(api.materias.gestion.$get({ query: consultaBajas(bajas) })),
  );
export const useCrearMateria = () =>
  useAccion((input: CrearMateria) =>
    unwrap<MateriaGestionDto>(api.materias.$post({ json: input })),
  );
export const useActualizarMateria = () =>
  useAccion(({ id, input }: Edicion<ActualizarMateria>) =>
    unwrap<MateriaGestionDto>(api.materias[":id"].$patch({ param: { id }, json: input })),
  );
export const useDarDeBajaMateria = () =>
  useAccion((id: string) =>
    unwrap<MateriaGestionDto>(api.materias[":id"].baja.$post({ param: { id } })),
  );
export const useReactivarMateria = () =>
  useAccion((id: string) =>
    unwrap<MateriaGestionDto>(api.materias[":id"].reactivar.$post({ param: { id } })),
  );

export const usePeriodosGestion = (bajas: boolean) =>
  useListado("periodos", { bajas }, () =>
    unwrap<PeriodoGestionDto[]>(api["periodos-lectivos"].$get({ query: consultaBajas(bajas) })),
  );
export const useCrearPeriodo = () =>
  useAccion((input: CrearPeriodo) =>
    unwrap<PeriodoGestionDto>(api["periodos-lectivos"].$post({ json: input })),
  );
export const useActualizarPeriodo = () =>
  useAccion(({ id, input }: Edicion<ActualizarPeriodo>) =>
    unwrap<PeriodoGestionDto>(
      api["periodos-lectivos"][":id"].$patch({ param: { id }, json: input }),
    ),
  );
export const useDarDeBajaPeriodo = () =>
  useAccion((id: string) =>
    unwrap<PeriodoGestionDto>(api["periodos-lectivos"][":id"].baja.$post({ param: { id } })),
  );
export const useReactivarPeriodo = () =>
  useAccion((id: string) =>
    unwrap<PeriodoGestionDto>(api["periodos-lectivos"][":id"].reactivar.$post({ param: { id } })),
  );

export const useComisionesGestion = (bajas: boolean) =>
  useListado("comisiones", { bajas }, () =>
    unwrap<ComisionGestionDto[]>(api.comisiones.gestion.$get({ query: consultaBajas(bajas) })),
  );
export const useCrearComision = () =>
  useAccion((input: CrearComisionInput) =>
    unwrap<ComisionGestionDto>(api.comisiones.$post({ json: input })),
  );
export const useActualizarComision = () =>
  useAccion(({ id, input }: Edicion<ActualizarComision>) =>
    unwrap<ComisionGestionDto>(api.comisiones[":id"].$patch({ param: { id }, json: input })),
  );
export const useDarDeBajaComision = () =>
  useAccion((id: string) =>
    unwrap<ComisionGestionDto>(api.comisiones[":id"].baja.$post({ param: { id } })),
  );
export const useReactivarComision = () =>
  useAccion((id: string) =>
    unwrap<ComisionGestionDto>(api.comisiones[":id"].reactivar.$post({ param: { id } })),
  );

export const useDocentesAsignables = () =>
  useQuery({
    queryKey: queryKeys.datosAcademicos("docentes"),
    queryFn: () => unwrap<DocenteAsignableDto[]>(api.docentes.$get()),
  });

export const useAulasHabituales = () =>
  useQuery({
    queryKey: queryKeys.datosAcademicos("aulas"),
    queryFn: () => unwrap<AulaDto[]>(api.horarios.aulas.$get()),
  });

export const useHorariosGestion = (bajas: boolean) =>
  useListado("horarios", { bajas }, () =>
    unwrap<HorarioGestionDto[]>(api.horarios.$get({ query: consultaBajas(bajas) })),
  );
export const useCrearHorario = () =>
  useAccion((input: CrearHorarioInput) =>
    unwrap<HorarioGestionDto>(api.horarios.$post({ json: input })),
  );
export const useActualizarHorario = () =>
  useAccion(({ id, input }: Edicion<ActualizarHorario>) =>
    unwrap<HorarioGestionDto>(api.horarios[":id"].$patch({ param: { id }, json: input })),
  );
export const useDarDeBajaHorario = () =>
  useAccion((id: string) =>
    unwrap<HorarioGestionDto>(api.horarios[":id"].baja.$post({ param: { id } })),
  );
export const useReactivarHorario = () =>
  useAccion((id: string) =>
    unwrap<HorarioGestionDto>(api.horarios[":id"].reactivar.$post({ param: { id } })),
  );

export const useDiasNoLaborablesGestion = (bajas: boolean) =>
  useListado("dias-no-laborables", { bajas }, () =>
    unwrap<DiaNoLaborableGestionDto[]>(
      api["dias-no-laborables"].$get({ query: consultaBajas(bajas) }),
    ),
  );
export const useCrearDiaNoLaborable = () =>
  useAccion((input: CrearDiaNoLaborable) =>
    unwrap<DiaNoLaborableGestionDto>(api["dias-no-laborables"].$post({ json: input })),
  );
export const useActualizarDiaNoLaborable = () =>
  useAccion(({ id, input }: Edicion<ActualizarDiaNoLaborable>) =>
    unwrap<DiaNoLaborableGestionDto>(
      api["dias-no-laborables"][":id"].$patch({ param: { id }, json: input }),
    ),
  );
export const useDarDeBajaDiaNoLaborable = () =>
  useAccion((id: string) =>
    unwrap<DiaNoLaborableGestionDto>(
      api["dias-no-laborables"][":id"].baja.$post({ param: { id } }),
    ),
  );
export const useReactivarDiaNoLaborable = () =>
  useAccion((id: string) =>
    unwrap<DiaNoLaborableGestionDto>(
      api["dias-no-laborables"][":id"].reactivar.$post({ param: { id } }),
    ),
  );

export type GenerarClases = { periodoLectivoId?: string; comisionId?: string };

export const useGenerarClases = () =>
  useAccion((input: GenerarClases) =>
    unwrap<GeneracionClasesDto>(api.comisiones["generar-clases"].$post({ json: input })),
  );
