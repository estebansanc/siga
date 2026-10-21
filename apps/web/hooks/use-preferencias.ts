"use client";

import type { PreferenciasDto } from "@repo/api/client";
import type { ActualizarPreferenciasInput } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export const usePreferencias = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.preferencias,
    queryFn: () => unwrap<PreferenciasDto>(api.preferencias.$get()),
    enabled,
  });

export const useActualizarPreferencias = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActualizarPreferenciasInput) =>
      unwrap<PreferenciasDto>(api.preferencias.$put({ json: input })),
    onSuccess: async (preferencias) => {
      queryClient.setQueryData(queryKeys.preferencias, preferencias);
      // Mis clases se filtra por las comisiones seguidas.
      await queryClient.invalidateQueries({ queryKey: ["clases"] });
    },
  });
};
