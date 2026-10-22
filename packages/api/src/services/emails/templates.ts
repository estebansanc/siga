import { tipoNovedadLabels, type PrioridadAviso, type TipoNovedad } from "@repo/domain";

import { apiEnv } from "../../env";

// Plantillas puras: reciben el contexto ya resuelto y devuelven asunto y HTML. Sin librería de
// templates; el layout es una tabla de una columna que todos los clientes de email renderizan.
export type EmailContent = { subject: string; html: string };

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type SummaryRow = [label: string, value: string];

const summaryTable = (rows: SummaryRow[]) =>
  rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

export const emailLayout = (
  title: string,
  paragraphs: string[],
  rows: SummaryRow[],
  cta: { label: string; url: string },
  footer = "",
) => `<!doctype html>
<html lang="es">
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
${paragraphs.map((text) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${text}</p>`).join("")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">${summaryTable(rows)}</table>
<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(cta.label)}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">Si el botón no funciona, copiá este link: ${escapeHtml(cta.url)}</p>
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export type InvitationEmailContext = {
  organizationName: string;
  inviterName: string;
  url: string;
  expiresAt: Date;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: apiEnv.timeZone,
  day: "numeric",
  month: "long",
});

export const formatEmailDate = (date: Date) => dateFormatter.format(date);

export const invitationEmail = (context: InvitationEmailContext): EmailContent => ({
  subject: `${context.inviterName} te invitó a ${context.organizationName}`,
  html: emailLayout(
    `Invitación a ${context.organizationName}`,
    [
      "Hola,",
      `${escapeHtml(context.inviterName)} te invitó a unirte a la organización ${escapeHtml(context.organizationName)}. Iniciá sesión o registrate con este mismo email y aceptá la invitación.`,
      `El link vence el ${escapeHtml(formatEmailDate(context.expiresAt))}.`,
    ],
    [
      ["Organización", context.organizationName],
      ["Te invita", context.inviterName],
    ],
    { label: "Ver la invitación", url: context.url },
  ),
});

export type NovedadEmailContext = {
  materia: string;
  comision: string;
  tipo: TipoNovedad;
  clases: { fecha: string; horaInicio: string; horaFin: string }[];
  minutosDemora: number | null;
  enlaceVirtual: string | null;
  aulaNueva: string | null;
  mensaje: string | null;
  publicadaPorBedelia: boolean;
  clasesUrl: string;
  bajaUrl: string;
};

const isoToArgentine = (fecha: string) => fecha.split("-").reverse().join("/");

const fechaLine = (clases: NovedadEmailContext["clases"]) => {
  const primera = clases[0]!;
  const ultima = clases[clases.length - 1]!;
  if (clases.length === 1) {
    return `Fecha: ${isoToArgentine(primera.fecha)}, ${primera.horaInicio} a ${primera.horaFin}`;
  }
  return `Fechas: del ${isoToArgentine(primera.fecha)} al ${isoToArgentine(ultima.fecha)}`;
};

const datoLine = (context: NovedadEmailContext) => {
  if (context.tipo === "DEMORA" && context.minutosDemora !== null) {
    return `Demora: ${context.minutosDemora} ${context.minutosDemora === 1 ? "minuto" : "minutos"}`;
  }
  if (context.tipo === "VIRTUAL" && context.enlaceVirtual) {
    return `Enlace de la clase: ${context.enlaceVirtual}`;
  }
  if (context.tipo === "CAMBIO_AULA" && context.aulaNueva) {
    return `Aula nueva: ${context.aulaNueva}`;
  }
  return null;
};

// ETI-2: solo tipo, fechas, dato del tipo y mensaje publicado; nunca motivo personal ni autor.
export const novedadEmail = (context: NovedadEmailContext): EmailContent => {
  const subject = `Novedad en ${context.materia} ${context.comision}: ${tipoNovedadLabels[context.tipo]}`;
  const lines = [
    `Tipo: ${tipoNovedadLabels[context.tipo]}`,
    fechaLine(context.clases),
    datoLine(context),
    context.mensaje ? `Mensaje: ${context.mensaje}` : null,
    `Publicada por: ${context.publicadaPorBedelia ? "Bedelía" : "Docente"}`,
  ].filter((line): line is string => line !== null);
  const footer = `<p style="margin:16px 0 0;font-size:12px"><a href="${escapeHtml(context.bajaUrl)}" style="color:#6b7280">Dejar de recibir novedades por correo</a></p>`;
  return {
    subject,
    html: emailLayout(
      subject,
      lines.map(escapeHtml),
      [],
      { label: "Ver mis clases", url: context.clasesUrl },
      footer,
    ),
  };
};

export type AvisoEmailContext = {
  titulo: string;
  cuerpo: string;
  prioridad: PrioridadAviso;
  desde: Date;
  hasta: Date;
  avisosUrl: string;
  bajaUrl: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: apiEnv.timeZone,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const parrafosDe = (texto: string) =>
  texto
    .split(/\r?\n+/)
    .filter((linea) => linea.trim() !== "")
    .map(escapeHtml);

// El estudiante que no activó la opción no recibe el correo; quien sí, puede darse de baja sin
// iniciar sesión. Los demás perfiles no tienen esa opción, así que no llevan el enlace.
export const avisoEmail = (context: AvisoEmailContext): EmailContent => {
  const subject = `${context.prioridad === "URGENTE" ? "Aviso urgente" : "Aviso institucional"}: ${context.titulo}`;
  const footer = context.bajaUrl
    ? `<p style="margin:16px 0 0;font-size:12px"><a href="${escapeHtml(context.bajaUrl)}" style="color:#6b7280">Dejar de recibir avisos institucionales por correo</a></p>`
    : "";
  return {
    subject,
    html: emailLayout(
      context.titulo,
      parrafosDe(context.cuerpo),
      [
        ["Vigente desde", dateTimeFormatter.format(context.desde)],
        ["Vigente hasta", dateTimeFormatter.format(context.hasta)],
      ],
      { label: "Ver los avisos", url: context.avisosUrl },
      footer,
    ),
  };
};

export type ResolucionAula = "APROBADA" | "RECHAZADA" | "REASIGNADA" | "ASIGNADA";

export type SolicitudAulaEmailContext = {
  resolucion: ResolucionAula;
  materia: string;
  comision: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  aula: string;
  aulaAnterior: string | null;
  motivo: string | null;
  url: string;
};

const asuntosAula: Record<ResolucionAula, string> = {
  APROBADA: "Solicitud de aula aprobada",
  RECHAZADA: "Solicitud de aula rechazada",
  REASIGNADA: "Cambio de aula",
  ASIGNADA: "Aula asignada",
};

const introsAula: Record<ResolucionAula, string> = {
  APROBADA: "Bedelía aprobó la solicitud de aula para tu clase.",
  RECHAZADA: "Bedelía rechazó la solicitud de aula para tu clase y la clase conserva su aula.",
  REASIGNADA: "Bedelía cambió el aula de tu clase.",
  ASIGNADA: "Bedelía asignó un aula a tu clase.",
};

const filasAula = (context: SolicitudAulaEmailContext): SummaryRow[] => {
  switch (context.resolucion) {
    case "RECHAZADA":
      return [
        ["Aula pedida", context.aula],
        ["Motivo", context.motivo ?? ""],
      ];
    case "REASIGNADA":
      return [
        ["Aula anterior", context.aulaAnterior ?? ""],
        ["Aula nueva", context.aula],
      ];
    default:
      return [["Aula", context.aula]];
  }
};

// Les llega a los docentes de la comisión cuando bedelía resuelve un pedido de aula o asigna
// una a una clase sin aula.
export const solicitudAulaEmail = (context: SolicitudAulaEmailContext): EmailContent => {
  const subject = `${asuntosAula[context.resolucion]}: ${context.materia} ${context.comision}`;
  return {
    subject,
    html: emailLayout(
      asuntosAula[context.resolucion],
      [introsAula[context.resolucion]],
      [
        ["Materia", context.materia],
        ["Comisión", context.comision],
        ["Fecha", isoToArgentine(context.fecha)],
        ["Franja", `${context.horaInicio} a ${context.horaFin}`],
        ...filasAula(context),
      ],
      { label: "Ver mis clases", url: context.url },
    ),
  };
};
