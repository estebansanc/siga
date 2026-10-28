"use client";

import type { PoliticaPrivacidadDto } from "@repo/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export const politicaVigenteQuery = () =>
  unwrap<PoliticaPrivacidadDto>(api["politica-de-privacidad"].$get());

export const usePoliticaPrivacidad = (initialData: PoliticaPrivacidadDto) =>
  useQuery({ queryKey: queryKeys.politicaPrivacidad, queryFn: politicaVigenteQuery, initialData });

export const useAceptarPolitica = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) =>
      unwrap<PoliticaPrivacidadDto>(
        api["politica-de-privacidad"].aceptaciones.$post({ json: { version } }),
      ),
    onSuccess: (politica) => {
      queryClient.setQueryData(queryKeys.politicaPrivacidad, politica);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};
