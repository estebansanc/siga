"use client";

import { useMutation } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";

export const useBajaCorreo = () =>
  useMutation({
    mutationFn: (token: string) =>
      unwrap<{ ok: true }>(api.preferencias["baja-correo"].$post({ json: { token } })),
  });
