import { describe, expect, it } from "vitest";

import { escapeHtml, formatEmailDate, invitationEmail, novedadEmail } from "./templates";

describe("plantillas de email", () => {
  it("formatea la fecha en hora de Argentina", () => {
    expect(formatEmailDate(new Date("2026-09-22T01:00:00.000Z"))).toBe("21 de septiembre");
  });

  it("escapa el HTML de los valores", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("la invitación a la organización lleva quién invita, el link y el vencimiento", () => {
    const email = invitationEmail({
      organizationName: "Organización & Cía",
      inviterName: "Ana <Demo>",
      url: "https://app.test/invitacion/inv-1",
      expiresAt: new Date("2026-09-22T13:00:00.000Z"),
    });
    expect(email.subject).toBe("Ana <Demo> te invitó a Organización & Cía");
    expect(email.html).toContain("Ana &lt;Demo&gt; te invitó");
    expect(email.html).toContain("Organización &amp; Cía");
    expect(email.html).toContain("El link vence el 22 de septiembre.");
    expect(email.html).toContain('href="https://app.test/invitacion/inv-1"');
    expect(email.html).toContain("Ver la invitación");
  });
});

describe("correo de novedad", () => {
  const base = {
    materia: "Proyecto Final",
    comision: "5K2",
    clases: [{ fecha: "2026-10-23", horaInicio: "19:00", horaFin: "23:00" }],
    minutosDemora: null,
    enlaceVirtual: null,
    aulaNueva: null,
    mensaje: null,
    publicadaPorBedelia: false,
    clasesUrl: "https://app.test/clases",
    bajaUrl: "https://app.test/baja-correo?token=t",
  };

  it("cada tipo lleva su dato y Ausencia y Suspensión ninguno", () => {
    const datos = {
      DEMORA: ["Demora: 15 minutos", { minutosDemora: 15 }],
      VIRTUAL: [
        "Enlace de la clase: https://meet.test/x",
        { enlaceVirtual: "https://meet.test/x" },
      ],
      CAMBIO_AULA: ["Aula nueva: Aula 12", { aulaNueva: "Aula 12" }],
    } as const;
    for (const [tipo, [linea, extra]] of Object.entries(datos)) {
      const email = novedadEmail({ ...base, ...extra, tipo: tipo as keyof typeof datos });
      expect(email.html).toContain(linea);
    }
    for (const tipo of ["AUSENCIA", "SUSPENSION"] as const) {
      expect(novedadEmail({ ...base, tipo }).html).not.toMatch(
        /Demora:|Aula nueva:|Enlace de la clase:/,
      );
    }
  });

  it("asunto, fecha, mensaje escapado, autor, botón y enlace de baja", () => {
    const email = novedadEmail({
      ...base,
      tipo: "DEMORA",
      minutosDemora: 15,
      mensaje: "<b>Llego</b>",
      publicadaPorBedelia: true,
    });
    expect(email.subject).toBe("Novedad en Proyecto Final 5K2: Demora");
    expect(email.html).toContain("Fecha: 23/10/2026, 19:00 a 23:00");
    expect(email.html).toContain("Mensaje: &lt;b&gt;Llego&lt;/b&gt;");
    expect(email.html).toContain("Publicada por: Bedelía");
    expect(email.html).toContain("Ver mis clases");
    expect(email.html).toContain('href="https://app.test/baja-correo?token=t"');
    expect(email.html).toContain("Dejar de recibir novedades por correo");
  });

  it("con varias clases muestra el rango de fechas", () => {
    const email = novedadEmail({
      ...base,
      tipo: "SUSPENSION",
      clases: [
        { fecha: "2026-10-23", horaInicio: "19:00", horaFin: "23:00" },
        { fecha: "2026-10-30", horaInicio: "19:00", horaFin: "23:00" },
      ],
    });
    expect(email.html).toContain("Fechas: del 23/10/2026 al 30/10/2026");
  });
});
