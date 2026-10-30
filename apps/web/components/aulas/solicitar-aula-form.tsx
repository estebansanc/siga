"use client";

import type { AulaDto, AulaSugeridaDto, ClaseDto } from "@repo/api/client";
import {
  alumnosSolicitudSchema,
  comentarioSolicitudMax,
  equipamientoLabels,
  equipamientoSchema,
  fechaArgentina,
  type BuscarAulaSolicitud,
  type Equipamiento,
} from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { Label } from "@repo/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import {
  useBuscarAulas,
  useClasesSolicitables,
  useCrearSolicitudAula,
} from "@/hooks/use-solicitudes-aula";
import { showRequestError } from "@/lib/form-errors";

const describirClase = (clase: ClaseDto) =>
  `${clase.horaInicio} – ${clase.horaFin} · ${clase.materia.nombre} ${clase.comision.codigo}`;

const describirAula = (aula: AulaDto) =>
  `${aula.edificio}, ${aula.piso} · ${aula.capacidad} lugares`;

function AulaOpcion({
  aula,
  faltantes,
  elegida,
  onElegir,
}: {
  aula: AulaDto;
  faltantes?: string[];
  elegida: boolean;
  onElegir: () => void;
}) {
  return (
    <Item variant={elegida ? "muted" : "outline"} data-elegida={elegida || undefined}>
      <ItemContent>
        <ItemTitle>{aula.codigo}</ItemTitle>
        <ItemDescription>{describirAula(aula)}</ItemDescription>
        {faltantes?.length ? (
          <ItemDescription className="text-destructive">{faltantes.join(" · ")}</ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          size="sm"
          variant={elegida ? "default" : "outline"}
          aria-pressed={elegida}
          aria-label={`Elegir ${aula.codigo}`}
          onClick={onElegir}
        >
          {elegida ? "Elegida" : "Elegir"}
        </Button>
      </ItemActions>
    </Item>
  );
}

// RF-06: busca aulas libres para una clase según alumnos y recursos y confirma la solicitud.
export function SolicitarAulaForm({ onSolicitada }: { onSolicitada: () => void }) {
  const [fecha, setFecha] = useState(() => fechaArgentina(new Date()));
  const [claseId, setClaseId] = useState("");
  const [alumnos, setAlumnos] = useState("");
  const [recursos, setRecursos] = useState<Equipamiento[]>([]);
  const [errorAlumnos, setErrorAlumnos] = useState<string | null>(null);
  const [pedido, setPedido] = useState<BuscarAulaSolicitud | null>(null);
  const [aulaId, setAulaId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");

  const clases = useClasesSolicitables(fecha);
  const busqueda = useBuscarAulas(pedido);
  const crear = useCrearSolicitudAula();
  const clase = clases.data?.clases.find((candidata) => candidata.id === claseId);

  const reiniciarBusqueda = () => {
    setPedido(null);
    setAulaId(null);
    setErrorAlumnos(null);
  };

  const cambiar =
    <T,>(setter: (valor: T) => void) =>
    (valor: T) => {
      setter(valor);
      reiniciarBusqueda();
    };

  const toggleRecurso = (recurso: Equipamiento, marcado: boolean) =>
    cambiar(setRecursos)(
      marcado ? [...recursos, recurso] : recursos.filter((actual) => actual !== recurso),
    );

  const buscar = () => {
    const cantidad = alumnosSolicitudSchema.safeParse(alumnos);
    if (!cantidad.success) {
      setPedido(null);
      setErrorAlumnos(cantidad.error.issues[0]?.message ?? null);
      return;
    }
    setErrorAlumnos(null);
    setAulaId(null);
    setPedido({ claseId, alumnos: cantidad.data, recursos });
  };

  const confirmar = async () => {
    if (!pedido || !aulaId) return;
    try {
      await crear.mutateAsync({ ...pedido, aulaId, comentario });
      toast.success("Solicitud enviada");
      onSolicitada();
    } catch (error) {
      showRequestError(error);
    }
  };

  const sinCoincidencias = busqueda.data && busqueda.data.aulas.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="solicitud-fecha">Fecha</FieldLabel>
            <Input
              id="solicitud-fecha"
              type="date"
              value={fecha}
              onChange={(event) => {
                setFecha(event.target.value);
                setClaseId("");
                reiniciarBusqueda();
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="solicitud-clase">Clase</FieldLabel>
            <NativeSelect
              id="solicitud-clase"
              className="w-full"
              value={claseId}
              onChange={(event) => cambiar(setClaseId)(event.target.value)}
            >
              <NativeSelectOption value="">
                {clases.data?.clases.length === 0
                  ? "No hay clases para pedir aula"
                  : "Elegí una clase"}
              </NativeSelectOption>
              {clases.data?.clases.map((candidata) => (
                <NativeSelectOption key={candidata.id} value={candidata.id}>
                  {describirClase(candidata)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {clase ? (
          <p className="text-muted-foreground text-sm">
            Franja {clase.horaInicio} a {clase.horaFin} ·{" "}
            {clase.aula ? `Aula actual: ${clase.aula.codigo}` : "Sin aula asignada"}
          </p>
        ) : null}
        <Field data-invalid={Boolean(errorAlumnos)}>
          <FieldLabel htmlFor="solicitud-alumnos">Cantidad de alumnos</FieldLabel>
          <Input
            id="solicitud-alumnos"
            type="number"
            inputMode="numeric"
            value={alumnos}
            aria-invalid={Boolean(errorAlumnos)}
            onChange={(event) => cambiar(setAlumnos)(event.target.value)}
          />
          <FieldError>{errorAlumnos}</FieldError>
        </Field>
        <Field>
          <FieldLabel>Recursos</FieldLabel>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Recursos">
            {equipamientoSchema.options.map((recurso) => (
              <Label key={recurso} className="font-normal">
                <Checkbox
                  checked={recursos.includes(recurso)}
                  onCheckedChange={(valor) => toggleRecurso(recurso, valor === true)}
                />
                {equipamientoLabels[recurso]}
              </Label>
            ))}
          </div>
        </Field>
      </FieldGroup>
      <Button type="button" disabled={!claseId || busqueda.isFetching} onClick={buscar}>
        {busqueda.isFetching ? <Spinner /> : null}
        Buscar aulas
      </Button>

      {busqueda.isFetching && !busqueda.data ? <Skeleton className="h-24 w-full" /> : null}
      {busqueda.data ? (
        <section className="flex flex-col gap-3" aria-label="Resultados">
          {sinCoincidencias ? (
            <Alert>
              <AlertTitle>Ninguna aula cumple todos los criterios.</AlertTitle>
              {!busqueda.data.hayAulasLibres ? (
                <AlertDescription>No hay aulas libres en esa franja.</AlertDescription>
              ) : (
                <AlertDescription>Estas aulas libres cumplen en parte:</AlertDescription>
              )}
            </Alert>
          ) : null}
          <ItemGroup className="gap-2">
            {busqueda.data.aulas.map((aula) => (
              <AulaOpcion
                key={aula.id}
                aula={aula}
                elegida={aula.id === aulaId}
                onElegir={() => setAulaId(aula.id)}
              />
            ))}
            {busqueda.data.sugerencias.map((sugerida: AulaSugeridaDto) => (
              <AulaOpcion
                key={sugerida.id}
                aula={sugerida}
                faltantes={sugerida.faltantes}
                elegida={sugerida.id === aulaId}
                onElegir={() => setAulaId(sugerida.id)}
              />
            ))}
          </ItemGroup>
        </section>
      ) : null}

      {aulaId ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="solicitud-comentario">
              Comentario{" "}
              <span className="text-muted-foreground font-normal">
                (opcional, máx. {comentarioSolicitudMax})
              </span>
            </FieldLabel>
            <Textarea
              id="solicitud-comentario"
              rows={3}
              maxLength={comentarioSolicitudMax}
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
            />
            <FieldDescription>
              {comentario.length} / {comentarioSolicitudMax}
            </FieldDescription>
          </Field>
          <Button type="button" disabled={crear.isPending} onClick={() => void confirmar()}>
            {crear.isPending ? <Spinner /> : null}
            Confirmar solicitud
          </Button>
        </FieldGroup>
      ) : null}
    </div>
  );
}
