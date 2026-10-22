"use client";

import type { ClaseDto, SesionQrDto } from "@repo/api/client";
import type { GenerarQrInput } from "@repo/domain";
import { useMutation, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export const useClasesDelTurno = (consulta: GenerarQrInput) =>
  useQuery({
    queryKey: queryKeys.clasesDelTurno(consulta),
    queryFn: () => unwrap<ClaseDto[]>(api.qr.clases.$get({ query: consulta })),
    // El bedel ve aparecer las asistencias a medida que los docentes escanean.
    refetchInterval: 15_000,
  });

export const useGenerarQr = () =>
  useMutation({
    mutationFn: (input: GenerarQrInput) =>
      unwrap<SesionQrDto>(api.qr.sesiones.$post({ json: input })),
  });
