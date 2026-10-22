"use client";

import type { BajaCorreoResultadoDto } from "@repo/api/client";
import { useMutation } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";

export const useBajaCorreo = () =>
  useMutation({
    mutationFn: (token: string) =>
      unwrap<BajaCorreoResultadoDto>(api.preferencias["baja-correo"].$post({ json: { token } })),
  });
