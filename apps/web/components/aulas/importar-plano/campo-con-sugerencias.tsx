"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/combobox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";

type CampoConSugerenciasProps = {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: string[];
  error?: string;
  onChange: (valor: string) => void;
};

// Se elige uno existente o se escribe uno nuevo: el valor es siempre lo que muestra el campo.
export function CampoConSugerencias({
  id,
  etiqueta,
  valor,
  opciones,
  error,
  onChange,
}: CampoConSugerenciasProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Combobox
        items={opciones}
        value={valor || null}
        inputValue={valor}
        onInputValueChange={onChange}
        onValueChange={(elegido) => typeof elegido === "string" && onChange(elegido)}
      >
        <ComboboxInput id={id} className="w-full" aria-invalid={Boolean(error)} />
        <ComboboxContent>
          <ComboboxList>
            {(opcion: string) => (
              <ComboboxItem key={opcion} value={opcion}>
                {opcion}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
