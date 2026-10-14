#!/usr/bin/env python3
"""Genera D1–D8 (1440x900) en HTML con el mismo sistema visual de los mockups de Figma y los renderiza a PNG con Chrome headless."""
import os, random, subprocess, sys

OUT_DIR = sys.argv[1]
HTML_DIR = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
:root{--bg:#fff;--surf:#F4F4F5;--border:#E4E4E7;--text:#09090B;--muted:#71717A;--primary:#18181B;--green:#16A34A;--yellow:#CA8A04;--red:#DC2626;--blue:#2563EB;--gray:#71717A}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1440px;height:900px;overflow:hidden;font-family:'Google Sans Flex','Google Sans','Inter',system-ui,sans-serif;font-size:14px;line-height:1.45;color:var(--text);background:#fff;-webkit-font-smoothing:antialiased}
svg.i{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex:none}
.app{display:flex;width:1440px;height:900px}
.sidebar{width:256px;flex:none;background:var(--surf);border-right:1px solid var(--border);padding:16px 12px;display:flex;flex-direction:column;gap:4px}
.logo{display:flex;gap:10px;align-items:center;padding:4px 8px 16px}
.mark{width:32px;height:32px;border-radius:8px;background:var(--primary);color:#fff;display:grid;place-items:center;font-weight:600;font-size:16px;flex:none}
.logo b{display:block;font-size:15px;font-weight:600;line-height:1.2}.logo small{font-size:11px;color:var(--muted)}
.section{font-size:11px;font-weight:500;color:var(--muted);padding:0 8px 6px}
.menu{display:flex;flex-direction:column;gap:4px}
.menu a{display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:8px;color:var(--muted);font-size:14px;text-decoration:none;border:1px solid transparent}
.menu a.active{background:#fff;border-color:var(--border);color:var(--text);font-weight:500}
.spacer{flex:1}
.user{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:8px;background:#fff}
.user .av{width:32px;height:32px;border-radius:999px;background:var(--primary);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:500;flex:none}
.user b{display:block;font-size:13px;font-weight:500;line-height:1.2}.user small{font-size:11px;color:var(--muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.user .more{margin-left:auto;color:var(--muted)}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.header{height:64px;flex:none;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px}
h1{font-size:22px;font-weight:600}h2{font-size:16px;font-weight:600}h3{font-size:14px;font-weight:600}
.indicator{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 12px;border-radius:999px;border:1px solid;font-size:14px;font-weight:600;color:var(--green);background:rgba(22,163,74,.1);border-color:var(--green)}
.indicator .m{font-weight:400;color:var(--muted);font-size:13px}
.content{padding:24px 32px;display:flex;flex-direction:column;gap:20px;flex:1;overflow:hidden;min-height:0}
.cols{display:flex;gap:24px;align-items:flex-start;min-height:0}
.card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:8px;font-weight:500;font-size:14px;background:var(--primary);color:#fff;border:1px solid transparent;white-space:nowrap}
.btn.outline{background:#fff;color:var(--text);border-color:var(--border)}.btn.danger{background:var(--red)}.btn.dangerout{background:#fff;color:var(--red);border-color:var(--red)}
.btn.sm{height:32px;font-size:12px;padding:0 12px;gap:6px}.btn.sm svg.i{width:14px;height:14px}.btn.icon{width:32px;padding:0}
.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 8px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.badge svg.i{width:12px;height:12px;stroke-width:2.25}
.badge.green{color:var(--green);background:rgba(22,163,74,.12)}.badge.yellow{color:var(--yellow);background:rgba(202,138,4,.12)}.badge.red{color:var(--red);background:rgba(220,38,38,.12)}.badge.blue{color:var(--blue);background:rgba(37,99,235,.12)}.badge.gray{color:var(--gray);background:rgba(113,113,122,.12)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;background:var(--surf);border:1px solid var(--border);white-space:nowrap}.chip.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}.field label{font-size:13px;font-weight:500}
.input{height:40px;border:1px solid var(--border);border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:8px;background:#fff;font-size:14px;white-space:nowrap}
.input .ph{color:var(--muted)}.input .suf{margin-left:auto;color:var(--muted);display:flex}
.textarea{height:84px;align-items:flex-start;padding:10px 12px;white-space:normal;line-height:1.4}
.hint{font-size:12px;color:var(--muted)}
.row{display:flex;gap:12px;align-items:center}.row.top{align-items:flex-start}.grow{flex:1;min-width:0}.between{justify-content:space-between}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:13px}
th{background:var(--surf);text-align:left;font-size:12px;font-weight:500;color:var(--muted);padding:10px 16px;white-space:nowrap}
td{padding:10px 16px;border-top:1px solid var(--border);vertical-align:middle}
tr.hl td{background:rgba(37,99,235,.06)}
.muted{color:var(--muted)}.b{font-weight:500}.sb{font-weight:600}.sm{font-size:12px}.nowrap{white-space:nowrap}
.checkbox{display:flex;align-items:center;gap:8px;font-size:14px}.checkbox i{width:18px;height:18px;border-radius:4px;border:1px solid var(--border);display:grid;place-items:center;font-style:normal}.checkbox i.on{background:var(--primary);border-color:var(--primary);color:#fff}.checkbox i svg.i{width:11px;height:11px;stroke-width:3}
.seg{display:inline-flex;gap:4px;padding:4px;border-radius:10px;background:var(--surf)}.seg span{padding:6px 12px;border-radius:7px;font-size:13px;font-weight:500;color:var(--muted);white-space:nowrap}.seg span.on{background:#fff;border:1px solid var(--border);color:var(--text);font-weight:600}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border)}.tabs span{padding:8px 14px 10px;font-size:14px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}.tabs span.on{color:var(--text);border-color:var(--primary)}
.dot{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.dot i{width:8px;height:8px;border-radius:999px;background:var(--blue);flex:none}.dot.off i{background:transparent;border:1.5px solid var(--muted)}.dot.off{color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.kpi{border:1px solid var(--border);border-radius:10px;padding:16px 20px;display:flex;flex-direction:column;gap:4px}.kpi .l{font-size:12px;font-weight:500;color:var(--muted)}.kpi .v{font-size:30px;font-weight:600;line-height:1.1}.kpi .d{font-size:12px;color:var(--muted);display:flex;gap:6px;align-items:center}
.main{position:relative}
.backdrop{position:absolute;inset:0;background:rgba(9,9,11,.22)}
.panel{position:absolute;top:0;right:0;bottom:0;width:400px;border-left:1px solid var(--border);padding:24px;display:flex;flex-direction:column;gap:14px;background:#fff;box-shadow:-12px 0 32px rgba(9,9,11,.12)}
.compact td,.compact th{padding:10px 10px}
.pagination{display:flex;justify-content:space-between;align-items:center}
.pg{display:flex;gap:8px}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}.list>div{padding:12px 16px;display:flex;flex-direction:column;gap:4px}.list>div+div{border-top:1px solid var(--border)}
.progress{height:8px;border-radius:999px;background:var(--surf);overflow:hidden;width:100%}.progress i{display:block;height:100%;background:var(--green);border-radius:999px}
.qr{display:grid;grid-template-columns:repeat(21,1fr);width:336px;height:336px;background:#fff;padding:16px;border:1px solid var(--border);border-radius:10px}.qr i{display:block}.qr i.k{background:var(--text)}
.timeline{display:flex;flex-direction:column;gap:0}.timeline>div{display:flex;gap:12px;align-items:flex-start;padding:6px 0}.timeline .pt{width:10px;height:10px;border-radius:999px;margin-top:6px;flex:none;border:2px solid var(--muted)}.timeline .pt.cur{background:var(--red);border-color:var(--red)}
.photo{height:120px;border-radius:8px;background:var(--surf);border:1px dashed var(--border);display:grid;place-items:center;color:var(--muted);font-size:12px}
"""

ICONS = {
    "circle-dot": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
    "grid": '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    "qr": '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    "inbox": '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    "alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "db": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    "chart": '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "more": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "chev": '<path d="m6 9 6 6 6-6"/>',
    "cal": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    "circle": '<circle cx="12" cy="12" r="10"/>',
    "bang": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "refresh": '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    "expand": '<path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/>',
    "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    "send": '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
}

def ic(name, cls="i"):
    return f'<svg class="{cls}" viewBox="0 0 24 24">{ICONS[name]}</svg>'

def badge(text, color, icon):
    return f'<span class="badge {color}">{ic(icon)}{text}</span>'

def chip(text, on=False):
    return f'<span class="chip{" on" if on else ""}">{text}</span>'

def chips(items):
    return '<span class="chips">' + "".join(chip(i) for i in items) + "</span>"

def field(label, value, placeholder=False, suffix=None, area=False, hint=None, style="", prefix=None):
    cls = "input" + (" textarea" if area else "")
    v = f'<span class="{"ph" if placeholder else ""}">{value}</span>'
    suf = f'<span class="suf">{ic(suffix) if suffix in ICONS else suffix}</span>' if suffix else ""
    pre = ic(prefix) if prefix else ""
    lab = f"<label>{label}</label>" if label else ""
    h = f'<span class="hint">{hint}</span>' if hint else ""
    return f'<div class="field" style="{style}">{lab}<div class="{cls}">{pre}{v}{suf}</div>{h}</div>'

def select(label, value, style="", placeholder=False):
    return field(label, value, suffix="chev", style=style, placeholder=placeholder)

def checkbox(label, on=True):
    return f'<div class="checkbox"><i class="{"on" if on else ""}">{ic("check") if on else ""}</i>{label}</div>'

def seg(options, on):
    return '<span class="seg">' + "".join(f'<span class="{"on" if o == on else ""}">{o}</span>' for o in options) + "</span>"

def table(cols, rows, hl=None):
    th = "".join(f'<th style="{w}">{l}</th>' for l, w in cols)
    trs = []
    for i, r in enumerate(rows):
        cls = ' class="hl"' if hl and hl(i) else ""
        trs.append(f"<tr{cls}>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>")
    return f"<table><thead><tr>{th}</tr></thead><tbody>{''.join(trs)}</tbody></table>"

MENU_BEDEL = [("circle-dot", "Estado institucional"), ("grid", "Aulas"), ("qr", "QR de asistencia"), ("inbox", "Solicitudes"), ("alert", "Incidencias"), ("mail", "Avisos"), ("users", "Usuarios"), ("db", "Datos académicos")]
MENU_AUT = [("chart", "Consultas históricas"), ("mail", "Avisos"), ("users", "Usuarios")]
BEDEL = ("RB", "Rosa Benítez", "bedelia@frt.utn.edu.ar", "Bedelía")
AUT = ("CM", "Dra. Carla Medina", "direccion.sistemas@frt.utn.edu.ar", "Autoridad académica")

def shell(title, menu, active, user, body, state="Institución abierta", time="08:05"):
    items = "".join(f'<a class="{"active" if i == active else ""}">{ic(icn)}{lbl}</a>' for i, (icn, lbl) in enumerate(menu))
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,400;6..144,500;6..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><div class="app">
<aside class="sidebar"><div class="logo"><div class="mark">S</div><div><b>SiGA</b><small>UTN Facultad Regional Tucumán</small></div></div>
<div class="section">{user[3]}</div><nav class="menu">{items}</nav><div class="spacer"></div>
<div class="user"><div class="av">{user[0]}</div><div><b>{user[1]}</b><small>{user[2]}</small></div><span class="more">{ic("more")}</span></div></aside>
<main class="main"><div class="header"><h1>{title}</h1><span class="indicator">{ic("check")}{state}<span class="m">· Actualizado {time}</span></span></div>
<div class="content">{body}</div></main></div></body></html>"""

# ---------- D1 ----------
def d1():
    hist = table([("Fecha y hora", "width:150px"), ("Estado", "width:200px"), ("Motivo", ""), ("Usuario", "width:140px")], [
        ['<span class="muted nowrap">14/10/2025 07:30</span>', badge("Abierta", "green", "check"), "—", "Rosa Benítez"],
        ['<span class="muted nowrap">13/10/2025 23:35</span>', badge("Cerrada", "red", "x"), "Cierre diario", "Rosa Benítez"],
        ['<span class="muted nowrap">13/10/2025 07:28</span>', badge("Abierta", "green", "check"), "—", "Julio Páez"],
        ['<span class="muted nowrap">10/10/2025 14:05</span>', badge("Abierta con novedades", "yellow", "bang"), "Corte de energía en Edificio B: clases del turno tarde en modalidad virtual", "Rosa Benítez"],
        ['<span class="muted nowrap">10/10/2025 07:31</span>', badge("Abierta", "green", "check"), "—", "Rosa Benítez"],
        ['<span class="muted nowrap">09/10/2025 23:31</span>', badge("Cerrada", "red", "x"), "Cierre diario", "Julio Páez"],
        ['<span class="muted nowrap">08/10/2025 09:10</span>', badge("Cerrada", "red", "x"), "Paro docente nacional: sin actividad académica", "Rosa Benítez"],
        ['<span class="muted nowrap">08/10/2025 07:30</span>', badge("Abierta", "green", "check"), "—", "Rosa Benítez"],
        ['<span class="muted nowrap">07/10/2025 23:30</span>', badge("Cerrada", "red", "x"), "Cierre diario", "Rosa Benítez"],
    ])
    body = f"""<div class="cols">
<div style="width:460px;flex:none;display:flex;flex-direction:column;gap:20px">
 <div class="card"><span class="sm b muted">Estado actual</span>
  <div class="row" style="gap:14px"><div style="width:48px;height:48px;border-radius:999px;background:var(--green);color:#fff;display:grid;place-items:center">{ic("check")}</div>
  <div><div style="font-size:32px;font-weight:600;color:var(--green);line-height:1.1">Abierta</div><span class="sm muted">Desde hoy 07:30 · registrado por Rosa Benítez</span></div></div>
  <span class="sm muted">Visible para todos los perfiles en menos de 60 segundos. Con la institución cerrada no se generan QR y las clases del día pasan a Suspendida.</span></div>
 <div class="card" style="gap:14px"><h2>Cambiar estado</h2>
  {select("Nuevo estado", "Abierta con novedades")}
  {field("Motivo (obligatorio para Cerrada y Abierta con novedades, máx. 280)", "Paro de transporte: actividad parcial. Las clases se dictan con normalidad.", area=True, hint="76 / 280")}
  {field("Vigencia estimada hasta", "14/10/2025 23:30", suffix="cal")}
  {checkbox("Generar aviso institucional asociado", True)}
  <div class="row" style="justify-content:flex-end"><span class="btn">Cambiar estado</span></div></div>
</div>
<div class="grow" style="display:flex;flex-direction:column;gap:12px">
 <div class="row between"><h2>Historial</h2><span class="sm muted">Últimos 30 días · registro inmutable con fecha, hora y usuario responsable</span></div>
 {hist}
 <div class="pagination"><span class="sm muted">Mostrando 9 de 41 cambios</span><div class="pg"><span class="btn outline sm">Anterior</span><span class="btn outline sm">Siguiente</span></div></div>
</div></div>"""
    return shell("Estado institucional", MENU_BEDEL, 0, BEDEL, body)

# ---------- D2 ----------
def d2():
    D, FS, EM = ("Disponible", "green", "check"), ("Fuera de servicio", "red", "x"), ("En mantenimiento", "yellow", "clock")
    def occ(txt, on):
        return f'<span class="dot {"" if on else "off"}"><i></i>{txt}</span>'
    rows_src = [
        ("Aula 3", "Edificio B · PB", 40, ["Proyector", "Pizarra"], D, "Ocupada · 4K2 hasta 21:00", True),
        ("Aula 5", "Edificio B · 1.º piso", 50, ["Proyector"], D, "Ocupada · 3K1 hasta 21:00", True),
        ("Aula 7", "Edificio B · PB", 45, ["Proyector", "Climatización"], D, "Libre", False),
        ("Aula 12", "Edificio A · 1.º piso", 60, ["Proyector", "Climatización", "Pantalla"], D, "Ocupada · 5K2 hasta 23:00", True),
        ("Aula 14", "Edificio A · 1.º piso", 60, ["Proyector", "Pizarra"], D, "Ocupada · 5K1 hasta 23:00", True),
        ("Aula 21", "Edificio A · 2.º piso", 35, ["Pizarra"], EM, "No disponible", False),
        ("Laboratorio 1", "Edificio A · 2.º piso", 30, ["Computadora", "Proyector", "Conectividad"], D, "Libre", False),
        ("Laboratorio 3", "Edificio A · 2.º piso", 80, ["Computadora", "Proyector", "Climatización"], FS, "No disponible", False),
        ("Aula Magna", "Edificio C · PB", 220, ["Proyector", "Pantalla", "Climatización", "Conectividad"], D, "Libre", False),
    ]
    rows = [[f'<span class="b">{r[0]}</span>', f'<span class="muted">{r[1]}</span>', f'<span class="nowrap">{r[2]} lugares</span>', chips(r[3]), badge(*r[4]), occ(r[5], r[6]), f'<span class="btn outline sm icon">{ic("more")}</span>'] for r in rows_src]
    t = table([("Código", "width:130px"), ("Ubicación", "width:170px"), ("Capacidad", "width:110px"), ("Equipamiento", ""), ("Estado", "width:170px"), ("Ocupación ahora", "width:230px"), ("", "width:64px")], rows)
    body = f"""<div class="row between"><div class="row">{field(None, "Buscar por código o ubicación", placeholder=True, prefix="search", style="width:320px")}{select(None, "Todos los estados", style="width:190px")}{select(None, "Todos los edificios", style="width:190px")}</div><span class="btn">{ic("plus")}Nueva aula</span></div>
<span class="sm muted">24 aulas · 20 disponibles · 2 fuera de servicio · 2 en mantenimiento · la ocupación se calcula en tiempo real a partir de las clases en curso</span>
{t}
<div class="pagination"><span class="sm muted">Mostrando 9 de 24 aulas</span><div class="pg"><span class="btn outline sm">Anterior</span><span class="btn outline sm">Siguiente</span></div></div>"""
    return shell("Aulas", MENU_BEDEL, 1, BEDEL, body)

# ---------- D3 ----------
def qr_grid():
    rnd = random.Random(7)
    n = 21
    cells = [[False] * n for _ in range(n)]
    def finder(r0, c0):
        for r in range(7):
            for c in range(7):
                ring = r in (0, 6) or c in (0, 6)
                core = 2 <= r <= 4 and 2 <= c <= 4
                cells[r0 + r][c0 + c] = ring or core
    finder(0, 0); finder(0, 14); finder(14, 0)
    for i in range(8, 13):
        cells[6][i] = i % 2 == 0; cells[i][6] = i % 2 == 0
    for r in range(n):
        for c in range(n):
            in_finder = (r < 8 and c < 8) or (r < 8 and c > 12) or (r > 12 and c < 8)
            if not in_finder and not (r == 6 or c == 6):
                cells[r][c] = rnd.random() < 0.48
    return '<div class="qr">' + "".join(f'<i class="{"k" if cells[r][c] else ""}"></i>' for r in range(n) for c in range(n)) + "</div>"

def d3():
    classes = [
        ("Proyecto Final · 5K2", "19:00 – 23:00 · Marcos Álvarez", badge("Docente presente · 19:02", "green", "check")),
        ("Inteligencia Artificial · 5K2", "19:00 – 21:00 · Laura Giménez", badge("Demorada 15 min", "yellow", "clock")),
        ("Simulación · 5K2", "21:00 – 23:00 · Pablo Ruiz", badge("Sin registrar", "gray", "circle")),
        ("Administración Gerencial · 5K2", "21:00 – 23:00 · Ana Torres", badge("Suspendida", "red", "x")),
    ]
    lst = '<div class="list">' + "".join(f'<div><div class="row between"><span class="b">{a}</span>{s}</div><span class="sm muted">{b}</span></div>' for a, b, s in classes) + "</div>"
    body = f"""<div class="row between"><div class="row top">{select("Aula", "Aula 12 · Edificio A, 1.º piso", style="width:300px")}{select("Turno", "Noche (18:00 – 23:30)", style="width:240px")}{field("Fecha", "14/10/2025", suffix="cal", style="width:170px")}<div class="field"><label>&nbsp;</label><span class="btn">{ic("qr")}Generar QR</span></div></div><span class="btn outline" style="align-self:flex-end">{ic("expand")}Pantalla completa</span></div>
<div class="cols">
 <div class="card" style="width:640px;flex:none;align-items:center;gap:16px;padding:28px">
  {qr_grid()}
  <div style="text-align:center"><div style="font-size:20px;font-weight:600">Aula 12 · Turno Noche · Se renueva en 42 s</div><span class="sm muted">Código de un solo uso por docente · vigencia 60 s · válido solo dentro de la institución</span></div>
  <div class="progress" style="width:420px"><i style="width:70%"></i></div>
  <div class="row" style="gap:20px"><span class="dot"><i style="background:var(--green)"></i><span class="sm">Institución abierta: generación habilitada</span></span><span class="sm muted">{ic("refresh")} Renovación automática activa</span></div>
 </div>
 <div class="grow" style="display:flex;flex-direction:column;gap:12px">
  <div class="row between"><h2>Clases en Aula 12 · Noche</h2><span class="sm muted">4 clases · actualizado hace 8 s</span></div>
  {lst}
  <div class="card" style="gap:8px"><h3>¿Un docente no puede escanear?</h3><span class="sm muted">Registrá la asistencia a mano con el motivo. Queda identificada como "Registro manual" en el histórico y no puede duplicarse.</span><div><span class="btn outline sm">Registrar asistencia manual</span></div></div>
 </div></div>"""
    return shell("QR de asistencia", MENU_BEDEL, 2, BEDEL, body)

# ---------- D4 ----------
def d4():
    P, AS, AP, RJ = badge("Pendiente", "yellow", "clock"), badge("Asignada (inmediata)", "blue", "bang"), badge("Aprobada", "green", "check"), badge("Rechazada", "red", "x")
    acts = f'<div class="row" style="gap:6px"><span class="btn sm">Aprobar</span><span class="btn outline sm">Rechazar</span></div>'
    acts_as = f'<div class="row" style="gap:6px"><span class="btn outline sm">Reasignar</span></div>'
    rows = [
        ["Marcos Álvarez", "Proyecto Final · 5K2", '<span class="nowrap">Hoy · 19:00 – 21:00</span>', "40", chips(["Proyector", "Climatización"]), "Aula 7", P, acts],
        ["Laura Giménez", "Inteligencia Artificial · 5K2", '<span class="nowrap">Hoy · 19:00 – 21:00</span>', "38", chips(["Proyector"]), "Aula 3", AS, acts_as],
        ["Pablo Ruiz", "Simulación · 5K2", '<span class="nowrap">15/10 · 21:00 – 23:00</span>', "32", chips(["Computadora", "Proyector"]), "Laboratorio 1", P, acts],
        ["Sofía Lema", "Bases de Datos · 3K1", '<span class="nowrap">16/10 · 14:00 – 16:00</span>', "55", chips(["Proyector", "Climatización"]), "Aula 12", P, acts],
        ["Diego Ponce", "Física I · 1K4", '<span class="nowrap">16/10 · 08:00 – 10:00</span>', "120", chips(["Proyector", "Pantalla"]), "Aula Magna", P, acts],
        ["Ana Torres", "Administración Gerencial · 5K2", '<span class="nowrap">13/10 · 21:00 – 23:00</span>', "30", chips(["Proyector"]), "Aula 5", AP, '<span class="sm muted">Aprobada por Julio Páez</span>'],
        ["Hernán Vega", "Química General · 1K2", '<span class="nowrap">13/10 · 08:00 – 10:00</span>', "90", chips(["Climatización"]), "Aula 21", RJ, '<span class="sm muted">Aula en mantenimiento</span>'],
    ]
    rows = [[r[0], r[1], r[2], r[6], r[7], r[3], r[4], r[5]] for r in rows]
    t = table([("Docente", "width:100px"), ("Comisión", "width:135px"), ("Fecha y franja", "width:125px"), ("Estado", "width:140px"), ("Acciones", "width:150px"), ("Alumnos", "width:70px"), ("Recursos", ""), ("Aula solicitada", "width:120px")], rows, hl=lambda i: i == 1)
    panel = f"""<div class="backdrop"></div><div class="panel"><div class="row between"><h2>Rechazar solicitud</h2><span class="muted">{ic("x")}</span></div>
<div class="card" style="padding:14px;gap:4px;background:var(--surf);border:none"><span class="b">Marcos Álvarez · Proyecto Final · 5K2</span><span class="sm muted">Hoy · 19:00 – 21:00 · 40 alumnos · Aula 7</span><span class="sm muted">Recursos: Proyector, Climatización</span></div>
{field("Motivo (obligatorio)", "El Aula 7 queda reservada para la mesa de examen de Análisis Matemático. Te sugerimos el Aula 12, que está libre en esa franja.", area=True, hint="118 / 280 · El docente recibe el motivo por correo y en la app")}
{select("Sugerir otra aula (opcional)", "Aula 12 · 60 lugares · libre 19:00 – 21:00")}
<div class="row" style="justify-content:flex-end;margin-top:auto"><span class="btn outline">Cancelar</span><span class="btn danger">Rechazar solicitud</span></div></div>"""
    body = f"""<div class="row between"><div class="row">{seg(["Pendientes", "Asignadas", "Aprobadas", "Rechazadas", "Todas"], "Pendientes")}{field(None, "14/10/2025 – 20/10/2025", suffix="cal", style="width:230px")}</div><span class="sm muted">5 pendientes · 1 asignación inmediata para revisar</span></div>
<div class="compact">{t}</div>
<div class="row" style="gap:8px"><span class="dot"><i></i><span class="sm">Fila destacada: solicitud asignada de inmediato porque la clase empezaba en menos de 30 min; podés reasignarla.</span></span></div>
<span class="sm muted">Al aprobar, el sistema verifica en una sola operación que el aula siga libre en esa franja: "El aula ya está asignada en esa franja" si otra operación la ocupó.</span>{panel}"""
    return shell("Solicitudes de aula", MENU_BEDEL, 3, BEDEL, body)

# ---------- D5 ----------
def d5():
    L, G = badge("Leve", "gray", "circle"), badge("Impide el uso del aula", "red", "alert")
    AB, EC, RS = badge("Abierta", "red", "circle"), badge("En curso", "yellow", "clock"), badge("Resuelta", "green", "check")
    rows = [
        ['<span class="b">Aula 7</span>', "Proyector", G, AB, "Marcos Álvarez (docente)", '<span class="muted nowrap">13/10/2025 18:20</span>'],
        ['<span class="b">Aula 21</span>', "Climatización", G, EC, "Rosa Benítez (bedel)", '<span class="muted nowrap">10/10/2025 09:05</span>'],
        ['<span class="b">Laboratorio 3</span>', "Conectividad", G, EC, "Julio Páez (bedel)", '<span class="muted nowrap">09/10/2025 15:40</span>'],
        ['<span class="b">Aula 12</span>', "Iluminación", L, AB, "Laura Giménez (docente)", '<span class="muted nowrap">13/10/2025 19:10</span>'],
        ['<span class="b">Aula 3</span>', "Mobiliario", L, RS, "Pablo Ruiz (docente)", '<span class="muted nowrap">07/10/2025 21:30</span>'],
        ['<span class="b">Aula 14</span>', "Pizarra", L, RS, "Rosa Benítez (bedel)", '<span class="muted nowrap">06/10/2025 08:12</span>'],
        ['<span class="b">Aula 5</span>', "Climatización", L, AB, "Ana Torres (docente)", '<span class="muted nowrap">14/10/2025 07:55</span>'],
    ]
    rows = [[r[0], r[1], r[2], r[3], r[5].replace("/2025 ", "/2025</span><br><span class=\"muted sm\">"), r[4]] for r in rows]
    t = table([("Aula", "width:90px"), ("Elemento", "width:100px"), ("Gravedad", "width:175px"), ("Estado", "width:110px"), ("Fecha", "width:100px"), ("Informante", "")], rows, hl=lambda i: i == 0)
    tl = """<div class="timeline">
<div><span class="pt cur"></span><div><span class="b sm">Abierta</span><br><span class="sm muted">13/10/2025 18:20 · Marcos Álvarez (docente)</span></div></div>
<div><span class="pt" style="border-style:dashed"></span><div><span class="sm muted">En curso · pendiente</span></div></div>
<div><span class="pt" style="border-style:dashed"></span><div><span class="sm muted">Resuelta · pendiente</span></div></div></div>"""
    panel = f"""<div class="backdrop"></div><div class="panel"><div class="row between"><h2>Aula 7 · Proyector</h2>{AB}</div>
<div class="row" style="gap:8px">{G}<span class="sm muted">13/10/2025 18:20 · Marcos Álvarez (docente)</span></div>
<span style="font-size:13px">El proyector enciende pero no detecta la señal HDMI desde ninguna notebook. Probamos con dos cables distintos. La clase se dio con pizarra.</span>
<div class="photo">{ic("camera")}&nbsp; foto-proyector.jpg · 0,8 MB</div>
<div style="padding:10px 12px;border-radius:8px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.3);font-size:12px">{ic("alert")} La gravedad "Impide el uso del aula" propone pasar el aula a Fuera de servicio. Tiene 3 clases asignadas esta semana.</div>
<h3>Historial de estados</h3>{tl}
{field("Observación", "Se avisó a Mantenimiento; revisan el jueves a la mañana.", area=True)}
<div class="row" style="justify-content:flex-end;margin-top:auto"><span class="btn outline">Pasar aula a Fuera de servicio</span><span class="btn">Marcar en curso</span></div></div>"""
    body = f"""<div class="row between"><div class="row">{seg(["Abiertas", "En curso", "Resueltas", "Todas"], "Abiertas")}{select(None, "Todas las aulas", style="width:190px")}{select(None, "Toda gravedad", style="width:170px")}</div><span class="btn">{ic("plus")}Nueva incidencia</span></div>
{t}<span class="sm muted">7 incidencias · 3 abiertas · 2 en curso · 2 resueltas · cada cambio de estado queda con fecha, hora y usuario responsable</span>{panel}"""
    return shell("Incidencias", MENU_BEDEL, 4, BEDEL, body)

# ---------- D6 ----------
def d6():
    pub = [
        ("Corte de energía programado el jueves 16", badge("Urgente", "red", "bang"), "Todos · 14/10 07:45 · vigente hasta 16/10 23:30", "128 enviados · 2 fallidos", True),
        ("Mantenimiento de SiGA el sábado 18", badge("Normal", "gray", "circle"), "Todos · 13/10 17:40 · vigente hasta 18/10 07:00", "312 enviados · 0 fallidos", False),
        ("Inscripción a exámenes finales de noviembre", badge("Normal", "gray", "circle"), "Perfil Estudiante · 10/10 09:12 · vigente hasta 24/10", "287 enviados · 5 fallidos", False),
        ("Charla: egresados en IA aplicada", badge("Normal", "gray", "circle"), "Ing. en Sistemas · 5.º año · 08/10 11:00 · vigente hasta 22/10", "64 enviados · 0 fallidos", False),
        ("Cambio de horario de Bedelía en octubre", badge("Normal", "gray", "circle"), "Perfil Docente · 01/10 08:30 · vencido el 10/10", "96 enviados · 1 fallido", False),
    ]
    lst = '<div class="list">' + "".join(
        f'<div><div class="row between"><span class="b">{t}</span>{b}</div><span class="sm muted">{m}</span><div class="row" style="gap:8px"><span class="dot"><i style="background:{"var(--red)" if "fallidos" in e and not e.startswith("0") and " 0 " not in e else "var(--green)"}"></i><span class="sm">{e}</span></span>{"<span class=\"sm muted\">· Ver fallidos</span>" if not " 0 " in e else ""}</div></div>'
        for t, b, m, e, u in pub) + "</div>"
    body = f"""<div class="cols" style="flex:1;min-height:0">
<div class="card" style="width:560px;flex:none;gap:14px"><h2>Redactar aviso</h2>
 {field("Título (máx. 100)", "Corte de energía programado el jueves 16", hint="41 / 100")}
 {field("Cuerpo (máx. 2.000)", "EDET interrumpe el suministro de 14:00 a 17:00. Las clases del turno tarde se dictan en modalidad virtual; los docentes publican el enlace como novedad de clase.", area=True, hint="166 / 2.000")}
 <div class="row top"><div class="field"><label>Prioridad</label><div>{seg(["Normal", "Urgente"], "Urgente")}</div></div><div class="field grow"><label>Destinatarios</label><div>{seg(["Todos", "Perfil", "Carrera", "Año", "Comisión"], "Todos")}</div></div></div>
 <div class="row top">{field("Vigencia desde", "14/10/2025 07:45", suffix="cal", style="flex:1")}{field("Vigencia hasta", "16/10/2025 23:30", suffix="cal", style="flex:1")}</div>
 {checkbox("Enviar por correo (a estudiantes solo si lo habilitaron en Preferencias)", True)}
 <span class="sm muted">Un aviso urgente se muestra también junto al indicador de estado institucional. Cada correo incluye un enlace para dejar de recibir notificaciones.</span>
 <div class="row" style="justify-content:flex-end"><span class="btn outline">Vista previa</span><span class="btn">{ic("send")}Publicar aviso</span></div></div>
<div class="grow" style="display:flex;flex-direction:column;gap:12px"><div class="row between"><h2>Avisos publicados</h2>{seg(["Vigentes", "Vencidos", "Todos"], "Todos")}</div>{lst}<span class="sm muted">El resultado de cada envío queda registrado por destinatario; los fallidos se pueden reenviar.</span></div></div>"""
    return shell("Avisos institucionales", MENU_BEDEL, 5, BEDEL, body)

# ---------- D7 ----------
def d7():
    ACT, INA = badge("Activo", "green", "check"), badge("Inactivo", "gray", "x")
    users = [
        ("Álvarez, Marcos", "28.456.789", "malvarez@frt.utn.edu.ar", "Docente", ACT, "Hoy 19:02"),
        ("Benítez, Rosa", "22.114.560", "bedelia@frt.utn.edu.ar", "Bedel", ACT, "Hoy 07:28"),
        ("Giménez, Laura", "30.221.004", "lgimenez@frt.utn.edu.ar", "Docente", ACT, "Hoy 18:40"),
        ("Gómez, Lucía", "43.880.112", "lucia.gomez@alu.frt.utn.edu.ar", "Estudiante", ACT, "Hoy 08:05"),
        ("Medina, Carla", "20.998.311", "direccion.sistemas@frt.utn.edu.ar", "Autoridad", ACT, "13/10/2025 16:20"),
        ("Páez, Julio", "25.671.908", "jpaez@frt.utn.edu.ar", "Bedel", ACT, "13/10/2025 23:35"),
        ("Ponce, Diego", "27.340.556", "dponce@frt.utn.edu.ar", "Docente", ACT, "13/10/2025 10:15"),
        ("Rodríguez, Tomás", "44.102.337", "tomas.rodriguez@alu.frt.utn.edu.ar", "Estudiante", INA, "02/09/2025 20:11"),
        ("Ruiz, Pablo", "26.778.201", "pruiz@frt.utn.edu.ar", "Docente", ACT, "13/10/2025 21:05"),
        ("Torres, Ana", "31.455.690", "atorres@frt.utn.edu.ar", "Docente", ACT, "12/10/2025 19:30"),
    ]
    rows = [[f'<span class="b">{n}</span>', d, f'<span class="muted">{e}</span>', chip(p), s, f'<span class="muted nowrap">{u}</span>', f'<span class="btn outline sm icon">{ic("more")}</span>'] for n, d, e, p, s, u in users]
    t = table([("Apellido y nombre", "width:200px"), ("DNI", "width:120px"), ("Correo", ""), ("Perfil", "width:120px"), ("Estado", "width:110px"), ("Último acceso", "width:160px"), ("", "width:64px")], rows)
    body = f"""<div class="tabs"><span class="on">Usuarios</span><span>Carreras</span><span>Materias</span><span>Comisiones</span><span>Horarios</span><span>Períodos</span></div>
<div class="row between"><div class="row">{field(None, "Buscar por nombre, DNI o correo", placeholder=True, prefix="search", style="width:320px")}{select(None, "Todos los perfiles", style="width:180px")}{select(None, "Activos", style="width:140px")}</div><span class="btn">{ic("plus")}Nuevo usuario</span></div>
{t}
<div class="pagination"><span class="sm muted">Mostrando 10 de 1.364 usuarios · DNI y correo solo visibles para Bedel y Autoridad · la desactivación es lógica</span><div class="pg"><span class="btn outline sm">Anterior</span><span class="btn outline sm">Siguiente</span></div></div>"""
    return shell("Usuarios y datos académicos", MENU_BEDEL, 6, BEDEL, body)

# ---------- D8 ----------
def d8():
    QR, MN = badge("QR", "green", "qr"), badge("Manual", "yellow", "bang")
    rows = [
        ["14/10/2025 19:02", "Marcos Álvarez", "Proyecto Final · 5K2", "Aula 12", QR, "Marcos Álvarez"],
        ["14/10/2025 18:58", "Diego Ponce", "Física I · 1K4", "Aula Magna", QR, "Diego Ponce"],
        ["14/10/2025 18:55", "Sofía Lema", "Bases de Datos · 3K1", "Aula 12", QR, "Sofía Lema"],
        ["14/10/2025 14:10", "Hernán Vega", "Química General · 1K2", "Aula 5", MN, "Rosa Benítez (bedel)"],
        ["14/10/2025 08:04", "Laura Giménez", "Inteligencia Artificial · 5K2", "Aula 7", QR, "Laura Giménez"],
        ["13/10/2025 21:03", "Pablo Ruiz", "Simulación · 5K2", "Aula 7", QR, "Pablo Ruiz"],
        ["13/10/2025 19:06", "Ana Torres", "Administración Gerencial · 5K2", "Laboratorio 3", MN, "Julio Páez (bedel)"],
        ["13/10/2025 19:01", "Marcos Álvarez", "Proyecto Final · 5K1", "Aula 14", QR, "Marcos Álvarez"],
    ]
    rows = [[f'<span class="muted nowrap">{a}</span>', f'<span class="b">{b}</span>', c, d, e, f] for a, b, c, d, e, f in rows]
    t = table([("Fecha y hora", "width:160px"), ("Docente", "width:170px"), ("Comisión", ""), ("Aula", "width:130px"), ("Método", "width:120px"), ("Usuario registrante", "width:200px")], rows)
    kpi = lambda l, v, d, icn: f'<div class="kpi"><span class="l">{l}</span><span class="v">{v}</span><span class="d">{ic(icn)}{d}</span></div>'
    body = f"""<div class="row between"><div class="row">{seg(["Asistencia docente", "Novedades", "Uso de aulas", "Incidencias"], "Asistencia docente")}{field(None, "01/08/2025 – 14/10/2025", suffix="cal", style="width:230px")}</div><span class="sm muted">Rango máximo 12 meses · responde en menos de 10 s</span></div>
<div class="row">{select(None, "Carrera: Ing. en Sistemas", style="width:220px")}{select(None, "Materia: todas", style="width:170px")}{select(None, "Comisión: todas", style="width:170px")}{select(None, "Docente: todos", style="width:170px")}{select(None, "Aula: todas", style="width:150px")}<span class="btn">{ic("search")}Consultar</span><span class="btn outline">Limpiar filtros</span></div>
<div class="kpis">{kpi("Asistencia docente", "91 %", "1.248 clases finalizadas en el período", "check")}{kpi("Registros por QR", "84 %", "1.051 registros con ubicación validada", "qr")}{kpi("Clases sin registro", "23", "Finalizadas sin asistencia del docente", "circle")}{kpi("Registros manuales", "12", "Con motivo y bedel responsable", "bang")}</div>
<div class="row between"><h2>Detalle de asistencias</h2><span class="sm muted">Cada registro conserva fecha, hora, método y usuario responsable; no se modifica retroactivamente</span></div>
{t}
<div class="pagination"><span class="sm muted">1 – 8 de 1.063 registros</span><div class="pg"><span class="btn outline sm">Anterior</span><span class="btn outline sm">1</span><span class="btn sm">2</span><span class="btn outline sm">3</span><span class="btn outline sm">…</span><span class="btn outline sm">107</span><span class="btn outline sm">Siguiente</span></div></div>"""
    return shell("Consultas históricas", MENU_AUT, 0, AUT, body)

PAGES = {"D1": d1, "D2": d2, "D3": d3, "D4": d4, "D5": d5, "D6": d6, "D7": d7, "D8": d8}

if __name__ == "__main__":
    only = sys.argv[2:] or list(PAGES)
    for key in only:
        html_path = os.path.join(HTML_DIR, f"{key}.html")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(PAGES[key]())
        png = os.path.join(OUT_DIR, f"{key}.png")
        subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--window-size=1440,900", "--force-device-scale-factor=1", "--virtual-time-budget=8000", f"--screenshot={png}", f"file://{html_path}"], check=True, capture_output=True)
        print(key, "->", png)
