"use client";

import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";

import { FormDialogContent } from "@/components/form-dialog-content";

import { SolicitarAulaForm } from "./solicitar-aula-form";

export function SolicitarAulaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            Buscá un aula libre para una de tus clases y pedila a bedelía.
          </DialogDescription>
        </DialogHeader>
        <SolicitarAulaForm
          onSolicitada={() => onOpenChange(false)}
          onVerSolicitudes={() => onOpenChange(false)}
        />
      </FormDialogContent>
    </Dialog>
  );
}
