"use client";

import type { AsignacionAulaHistoricaDto, ConsultaUsoAulasResultadoDto } from "@repo/api/client";
import {
  consultaUsoAulasSchema,
  origenAsignacionAulaLabels,
  origenAsignacionAulaSchema,
  type ConsultaUsoAulas,
} from "@repo/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/components/native-select";
import { Progress } from "@repo/ui/components/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

import { useConsultaUsoAulas } from "@/hooks/use-historico";
import { formatFechaCorta, formatFechaHora } from "@/lib/dates";

import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "./filtros-historico";

type Ocupacion = ConsultaUsoAulasResultadoDto["ocupacionGeneral"];

const formatHoras = (horas: number) => `${horas.toLocaleString("es-AR")} h`;

function OcupacionGeneral({ ocupacion }: { ocupacion: Ocupacion }) {
  return (
    <Card size="sm" aria-label="Ocupación general">
      <CardContent className="flex flex-col gap-2">
        <Progress value={ocupacion.porcentaje}>
          <span className="text-muted-foreground text-xs">Ocupación general</span>
          <span className="ml-auto text-2xl font-semibold">{ocupacion.porcentaje}%</span>
        </Progress>
        <p className="text-muted-foreground text-xs">
          {formatHoras(ocupacion.horasOcupadas)} ocupadas de{" "}
          {formatHoras(ocupacion.horasDisponibles)} disponibles
        </p>
      </CardContent>
    </Card>
  );
}

function OcupacionPorAula({ aulas }: { aulas: ConsultaUsoAulasResultadoDto["aulas"] }) {
  return (
    <Table aria-label="Ocupación por aula">
      <TableHeader>
        <TableRow>
          <TableHead>Aula</TableHead>
          <TableHead>Edificio</TableHead>
          <TableHead>Piso</TableHead>
          <TableHead className="text-right">Horas ocupadas</TableHead>
          <TableHead className="text-right">Horas disponibles</TableHead>
          <TableHead className="text-right">Ocupación</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aulas.map((aula) => (
          <TableRow key={aula.id}>
            <TableCell>
              {aula.codigo}
              {aula.activa ? null : " (dada de baja)"}
            </TableCell>
            <TableCell>{aula.edificio}</TableCell>
            <TableCell>{aula.piso}</TableCell>
            <TableCell className="text-right">{formatHoras(aula.horasOcupadas)}</TableCell>
            <TableCell className="text-right">{formatHoras(aula.horasDisponibles)}</TableCell>
            <TableCell className="text-right">{aula.porcentaje}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DetalleAsignaciones({ asignaciones }: { asignaciones: AsignacionAulaHistoricaDto[] }) {
  return (
    <Table aria-label="Asignaciones">
      <TableHeader>
        <TableRow>
          <TableHead>Asignada</TableHead>
          <TableHead>Aula</TableHead>
          <TableHead>Materia y comisión</TableHead>
          <TableHead>Clase</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Usuario</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {asignaciones.map((asignacion) => (
          <TableRow key={asignacion.id}>
            <TableCell className="whitespace-nowrap">
              {formatFechaHora(asignacion.asignadaEn)}
            </TableCell>
            <TableCell>{asignacion.aula}</TableCell>
            <TableCell>
              {asignacion.materia} · {asignacion.comision}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatFechaCorta(asignacion.fechaClase)} {asignacion.horaInicioClase} a{" "}
              {asignacion.horaFinClase}
            </TableCell>
            <TableCell>{origenAsignacionAulaLabels[asignacion.origen]}</TableCell>
            <TableCell>{asignacion.usuario}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Resultados({
  consulta,
  onPagina,
}: {
  consulta: ConsultaUsoAulas;
  onPagina: (pagina: number) => void;
}) {
  const resultado = useConsultaUsoAulas(consulta);
  if (!resultado.data) return <CargandoResultados />;

  const { ocupacionGeneral, aulas, clasesDelPeriodo, total, asignaciones, pagina, totalPaginas } =
    resultado.data;
  if (total === 0 && clasesDelPeriodo === 0) return <SinRegistros />;

  return (
    <div className="flex flex-col gap-6">
      <OcupacionGeneral ocupacion={ocupacionGeneral} />
      <OcupacionPorAula aulas={aulas} />
      {total === 0 ? null : (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Asignaciones</h3>
          <DetalleAsignaciones asignaciones={asignaciones} />
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={onPagina} />
        </div>
      )}
    </div>
  );
}

// RF-09 / CA-06 / EF-5: ocupación de las aulas y asignaciones del período, por fecha de clase.
export function HistoricoUsoAulas() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaUsoAulasSchema);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de aulas</CardTitle>
        <CardDescription>
          Ocupación de las aulas y asignaciones de las clases del período, por fecha de la clase.
          Las clases futuras cuentan como ocupación prevista. El rango puede abarcar hasta 12 meses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FiltrosForm
          filtros={filtros}
          errores={errores}
          onCambiar={cambiar}
          onConsultar={consultar}
        >
          <Field>
            <FieldLabel htmlFor="historico-origen">Origen</FieldLabel>
            <NativeSelect
              id="historico-origen"
              className="w-full"
              value={filtros.origen}
              onChange={(event) => cambiar("origen", event.target.value)}
            >
              <NativeSelectOption value="">Todos</NativeSelectOption>
              {origenAsignacionAulaSchema.options.map((origen) => (
                <NativeSelectOption key={origen} value={origen}>
                  {origenAsignacionAulaLabels[origen]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FiltrosForm>
        {consulta ? <Resultados consulta={consulta} onPagina={irAPagina} /> : null}
      </CardContent>
    </Card>
  );
}
