"use client";

import type {
  ConsultaAsistenciasResultadoDto,
  ConsultaNovedadesResultadoDto,
  ConsultaUsoAulasResultadoDto,
  OpcionesHistoricoDto,
} from "@repo/api/client";
import type {
  ConsultaAsistencias,
  ConsultaAsistenciasInput,
  ConsultaNovedades,
  ConsultaNovedadesInput,
  ConsultaUsoAulas,
  ConsultaUsoAulasInput,
} from "@repo/domain";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const comoQuery = (consulta: ConsultaNovedades | ConsultaAsistencias | ConsultaUsoAulas) =>
  Object.fromEntries(
    Object.entries(consulta)
      .filter(([, valor]) => valor !== undefined && valor !== "")
      .map(([campo, valor]) => [campo, String(valor)]),
  ) as Record<string, string>;

export const useConsultaNovedades = (consulta: ConsultaNovedades | null) =>
  useQuery({
    queryKey: queryKeys.historicoNovedades(consulta ? comoQuery(consulta) : {}),
    queryFn: () =>
      unwrap<ConsultaNovedadesResultadoDto>(
        api.historico.novedades.$get({ query: comoQuery(consulta!) as ConsultaNovedadesInput }),
      ),
    enabled: consulta !== null,
    placeholderData: keepPreviousData,
  });

export const useConsultaAsistencias = (consulta: ConsultaAsistencias | null) =>
  useQuery({
    queryKey: queryKeys.historicoAsistencias(consulta ? comoQuery(consulta) : {}),
    queryFn: () =>
      unwrap<ConsultaAsistenciasResultadoDto>(
        api.historico.asistencias.$get({ query: comoQuery(consulta!) as ConsultaAsistenciasInput }),
      ),
    enabled: consulta !== null,
    placeholderData: keepPreviousData,
  });

export const useConsultaUsoAulas = (consulta: ConsultaUsoAulas | null) =>
  useQuery({
    queryKey: queryKeys.historicoUsoAulas(consulta ? comoQuery(consulta) : {}),
    queryFn: () =>
      unwrap<ConsultaUsoAulasResultadoDto>(
        api.historico["uso-aulas"].$get({ query: comoQuery(consulta!) as ConsultaUsoAulasInput }),
      ),
    enabled: consulta !== null,
    placeholderData: keepPreviousData,
  });

export const useOpcionesHistorico = () =>
  useQuery({
    queryKey: queryKeys.historicoOpciones,
    queryFn: () => unwrap<OpcionesHistoricoDto>(api.historico.opciones.$get()),
    staleTime: 5 * 60_000,
  });
