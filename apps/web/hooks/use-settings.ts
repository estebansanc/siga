"use client";

import type { SettingsDto } from "@repo/api/client";
import type { UpdateSettingsInput } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export const useSettings = (initialData?: SettingsDto) =>
  useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => unwrap<SettingsDto>(api.settings.$get()),
    initialData,
  });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      unwrap<SettingsDto>(api.settings.$patch({ json: input })),
    onSuccess: async (_settings, input) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      // La barra lateral lee el nombre de "quién soy", no de los ajustes.
      if ("name" in input) await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};
