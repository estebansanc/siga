"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fechaArgentina,
  generarQrSchema,
  turnosEnOrden,
  turnosIniciales,
  type GenerarQrInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAulas } from "@/hooks/use-aulas";
import { useSettings } from "@/hooks/use-settings";
import { describirTurno } from "@/lib/turnos";

import { QrEnVivo } from "./qr-en-vivo";

type Emision = { consulta: GenerarQrInput; numero: number };

export function QrAsistencia() {
  const aulas = useAulas(false);
  const settings = useSettings();
  const turnos = settings.data?.turnos ?? turnosIniciales;
  const [emision, setEmision] = useState<Emision | null>(null);
  const form = useForm<GenerarQrInput>({
    resolver: zodResolver(generarQrSchema),
    defaultValues: { aulaId: "", turno: "MANANA", fecha: fechaArgentina(new Date()) },
  });

  // Cada "Generar QR" arranca una emisión nueva, aunque los datos no hayan cambiado.
  const generar = (consulta: GenerarQrInput) =>
    setEmision((anterior) => ({ consulta, numero: (anterior?.numero ?? 0) + 1 }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Generar QR</CardTitle>
          <CardDescription>
            El docente lo escanea al llegar al aula. Cada código vale 60 segundos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={form.handleSubmit(generar)}
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <FieldGroup className="md:flex-row">
              <Field data-invalid={Boolean(form.formState.errors.aulaId)}>
                <FieldLabel htmlFor="qr-aula">Aula</FieldLabel>
                <NativeSelect id="qr-aula" className="w-full" {...form.register("aulaId")}>
                  <NativeSelectOption value="">Seleccionar aula</NativeSelectOption>
                  {aulas.data?.map((aula) => (
                    <NativeSelectOption key={aula.id} value={aula.id}>
                      {aula.codigo}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.aulaId?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.turno)}>
                <FieldLabel htmlFor="qr-turno">Turno</FieldLabel>
                <NativeSelect id="qr-turno" className="w-full" {...form.register("turno")}>
                  {turnosEnOrden.map((turno) => (
                    <NativeSelectOption key={turno} value={turno}>
                      {describirTurno(turno, turnos[turno])}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.turno?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.fecha)}>
                <FieldLabel htmlFor="qr-fecha">Fecha</FieldLabel>
                <Input id="qr-fecha" type="date" {...form.register("fecha")} />
                <FieldError>{form.formState.errors.fecha?.message}</FieldError>
              </Field>
            </FieldGroup>
            <Button type="submit" className="md:mb-0">
              Generar QR
            </Button>
          </form>
        </CardContent>
      </Card>
      {emision ? <QrEnVivo key={emision.numero} consulta={emision.consulta} /> : null}
    </div>
  );
}
