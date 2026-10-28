"use client";

import type { ConsultaAsistenciasResultadoDto, RegistroHistoricoDto } from "@repo/api/client";
import {
  consultaAsistenciasSchema,
  metodoAsistenciaLabels,
  type ConsultaAsistencias,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { KeyboardIcon, QrCodeIcon } from "lucide-react";

import { useConsultaAsistencias } from "@/hooks/use-historico";
import { formatFechaHora } from "@/lib/dates";

import {
  CargandoResultados,
  FiltrosForm,
  Paginador,
  SinRegistros,
  useFiltrosHistoricos,
} from "./filtros-historico";

const porcentaje = (valor: number | null) => (valor === null ? "—" : `${valor}%`);

function Indicadores({
  indicadores,
}: {
  indicadores: ConsultaAsistenciasResultadoDto["indicadores"];
}) {
  const tarjetas = [
    {
      titulo: "Asistencia docente",
      valor: porcentaje(indicadores.porcentajeAsistencia),
      detalle: `${indicadores.clasesConAsistencia} de ${indicadores.clasesBase} clases`,
    },
    {
      titulo: "Registros por QR",
      valor: String(indicadores.registrosQr),
      detalle: `${porcentaje(indicadores.porcentajeQr)} del total`,
    },
    {
      titulo: "Registros manuales",
      valor: String(indicadores.registrosManuales),
      detalle: null,
    },
    {
      titulo: "Clases sin registro",
      valor: String(indicadores.clasesSinRegistro),
      detalle: null,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
      {tarjetas.map(({ titulo, valor, detalle }) => (
        <Card key={titulo} size="sm">
          <CardContent>
            <dt className="text-muted-foreground text-xs">{titulo}</dt>
            <dd className="text-2xl font-semibold">{valor}</dd>
            {detalle ? <dd className="text-muted-foreground text-xs">{detalle}</dd> : null}
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}

function MetodoBadge({ metodo }: { metodo: RegistroHistoricoDto["metodo"] }) {
  const Icono = metodo === "QR" ? QrCodeIcon : KeyboardIcon;
  return (
    <Badge variant={metodo === "QR" ? "default" : "outline"}>
      <Icono aria-hidden />
      {metodo === "QR" ? "QR" : "Manual"}
    </Badge>
  );
}

function DetalleAsistencias({ registros }: { registros: RegistroHistoricoDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Registrada</TableHead>
          <TableHead>Docente</TableHead>
          <TableHead>Materia y comisión</TableHead>
          <TableHead>Aula</TableHead>
          <TableHead>Método</TableHead>
          <TableHead>Registró</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((registro) => (
          <TableRow key={registro.id}>
            <TableCell className="whitespace-nowrap">
              {formatFechaHora(registro.registradaEn)}
            </TableCell>
            <TableCell>{registro.docente}</TableCell>
            <TableCell>
              {registro.materia} · {registro.comision}
            </TableCell>
            <TableCell>{registro.aula ?? "—"}</TableCell>
            <TableCell>
              <MetodoBadge metodo={registro.metodo} />
            </TableCell>
            <TableCell>
              {registro.registradaPor}
              {registro.registradaPorBedelia ? " (Bedelía)" : null}
            </TableCell>
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
  consulta: ConsultaAsistencias;
  onPagina: (pagina: number) => void;
}) {
  const resultado = useConsultaAsistencias(consulta);
  if (!resultado.data) return <CargandoResultados />;

  const { indicadores, total, registros, pagina, totalPaginas } = resultado.data;
  return (
    <div className="flex flex-col gap-4">
      <Indicadores indicadores={indicadores} />
      {total === 0 ? (
        <SinRegistros />
      ) : (
        <>
          <DetalleAsistencias registros={registros} />
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={onPagina} />
        </>
      )}
    </div>
  );
}

// RF-09 / RF-18 / EF-5: historial de asistencia docente, QR y manual por separado.
export function HistoricoAsistencias() {
  const { filtros, errores, consulta, cambiar, consultar, irAPagina } =
    useFiltrosHistoricos(consultaAsistenciasSchema);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asistencia docente</CardTitle>
        <CardDescription>
          Asistencia de las clases dictadas en el período, por fecha de la clase. Los métodos son{" "}
          {metodoAsistenciaLabels.QR} y registro manual. El rango puede abarcar hasta 12 meses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FiltrosForm
          filtros={filtros}
          errores={errores}
          onCambiar={cambiar}
          onConsultar={consultar}
        />
        {consulta ? <Resultados consulta={consulta} onPagina={irAPagina} /> : null}
      </CardContent>
    </Card>
  );
}
