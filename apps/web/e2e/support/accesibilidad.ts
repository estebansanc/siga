import { expect, type Page } from "@playwright/test";

export type Hallazgo = { selector: string; detalle: string };

const describeInPage = `
  const describir = (el) => {
    const id = el.id ? "#" + el.id : "";
    const nombre = el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 30);
    return el.tagName.toLowerCase() + id + "[" + nombre + "]";
  };
`;

const utilidadesDeColor = `
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = (color) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top, bottom) => {
      const a = top[3];
      return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat([1]);
    };
    const luminance = ([r, g, b]) => {
      const lin = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const fondoDe = (el) => {
      const capas = [];
      for (let n = el; n; n = n.parentElement) {
        const bg = rgba(getComputedStyle(n).backgroundColor);
        if (bg[3] > 0) capas.push(bg);
        if (bg[3] === 1) break;
      }
      return capas.reduceRight((abajo, capa) => over(capa, abajo), [255, 255, 255, 1]);
    };
    const opacidadDe = (el) => {
      let o = 1;
      for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none";
    };
`;

// Contraste de texto (4,5:1; 3:1 si es grande) y de bordes de campos (3:1), medido con el navegador.
export const medirContraste = (page: Page): Promise<Hallazgo[]> =>
  page.evaluate(`(() => {
    ${describeInPage}
    ${utilidadesDeColor}
    const out = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!visible(el) || el.closest("[disabled],[aria-disabled=true],[data-disabled],nextjs-portal,[data-sonner-toast]")) continue;
      const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const s = getComputedStyle(el);
      const fondo = fondoDe(el);
      if (tieneTexto) {
        const fg = rgba(s.color);
        fg[3] *= opacidadDe(el);
        const color = over(fg, fondo);
        const size = parseFloat(s.fontSize);
        const grande = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
        const minimo = grande ? 3 : 4.5;
        const r = ratio(color, fondo);
        if (r < minimo) out.push({ selector: describir(el), detalle: "texto " + r.toFixed(2) + ":1 (mínimo " + minimo + ")" });
      }
      if (el.matches("input[placeholder], textarea[placeholder]")) {
        const ph = rgba(getComputedStyle(el, "::placeholder").color);
        const fondoCampo = over(rgba(s.backgroundColor), fondo);
        const r = ratio(over(ph, fondoCampo), fondoCampo);
        if (r < 4.5) out.push({ selector: describir(el), detalle: "placeholder " + r.toFixed(2) + ":1 (mínimo 4.5)" });
      }
      if (el.matches("button, a[href]") && el.querySelector("svg") && !el.textContent.trim() && !el.disabled) {
        const icono = over(rgba(s.color), fondo);
        const r = ratio(icono, fondo);
        if (r < 3) out.push({ selector: describir(el), detalle: "ícono accionable " + r.toFixed(2) + ":1 (mínimo 3)" });
      }
      if (["INPUT", "TEXTAREA"].includes(el.tagName) && !["checkbox", "radio", "hidden"].includes(el.type)) {
        const borde = over(rgba(s.borderTopColor), fondo);
        const r = ratio(borde, fondo);
        if (r < 3) out.push({ selector: describir(el), detalle: "borde de campo " + r.toFixed(2) + ":1 (mínimo 3)" });
      }
    }
    return out;
  })()`);

// Botones, links, ítems de menú, checkbox, switch y pestañas de al menos 44x44 px (área táctil incluida).
export const medirZonasTactiles = (page: Page): Promise<Hallazgo[]> =>
  page.evaluate(`(() => {
    ${describeInPage}
    const selector = "button, a[href], [role=menuitem], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=combobox], input:not([type=hidden]), select, summary";
    const out = [];
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || s.visibility === "hidden" || s.display === "none") continue;
      if (el.closest("nextjs-portal,[data-sonner-toast],[inert]") || el.matches("[disabled]")) continue;
      if (el.matches("a") && s.display === "inline" && el.parentElement && /\\S/.test([...el.parentElement.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue;
      if (el.matches("input") && el.closest("label,[role=group]") && el.getBoundingClientRect().width < 2) continue;
      const after = getComputedStyle(el, "::after");
      const extraW = after.position === "absolute" ? parseFloat(after.width) || 0 : 0;
      const extraH = after.position === "absolute" ? parseFloat(after.height) || 0 : 0;
      const ancho = Math.max(r.width, extraW);
      const alto = Math.max(r.height, extraH);
      if (ancho < 43.5 || alto < 43.5) out.push({ selector: describir(el), detalle: Math.round(ancho) + "x" + Math.round(alto) + " px" });
    }
    return out;
  })()`);

export const esperarSinHallazgos = (hallazgos: Hallazgo[]) => {
  expect(hallazgos.map((h) => h.selector + " " + h.detalle)).toEqual([]);
};

// El foco se ve: borde, anillo (box-shadow) o contorno distinto del de reposo.
export const focoVisible = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const s = getComputedStyle(el);
    const contorno = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    return contorno || s.boxShadow !== "none";
  });

export const foco = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40) : "";
  });

// Indicador de foco (borde o contorno sólido) de cada elemento enfocable con Tab: 3:1 contra su fondo.
export const medirFoco = async (page: Page, pasos = 25): Promise<Hallazgo[]> => {
  const hallazgos: Hallazgo[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let paso = 0; paso < pasos; paso++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    hallazgos.push(
      ...(await page.evaluate<Hallazgo[]>(`(() => {
        ${describeInPage}
        ${utilidadesDeColor}
        const el = document.activeElement;
        if (!el || el === document.body) return [];
        const marco = el.matches("[data-slot=input-group-control]") ? el.closest("[data-slot=input-group]") ?? el : el;
        const s = getComputedStyle(marco);
        const fondo = fondoDe(marco.parentElement ?? marco);
        const contorno = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 ? rgba(s.outlineColor) : null;
        const borde = parseFloat(s.borderTopWidth) > 0 ? rgba(s.borderTopColor) : null;
        const anillos = [...s.boxShadow.matchAll(/[a-z]+\\([^)]*\\)/g)].map((m) => rgba(m[0]));
        const mejor = Math.max(...[contorno, borde, ...anillos].filter(Boolean).map((c) => ratio(over(c, fondo), fondo)), 0);
        return mejor < 3 ? [{ selector: describir(el), detalle: "foco " + mejor.toFixed(2) + ":1 (mínimo 3)" }] : [];
      })()`)),
    );
  }
  return hallazgos;
};
