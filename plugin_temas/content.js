(() => {
  if (window.__tcpLoaded) return;
  window.__tcpLoaded = true;

  const api = globalThis.browser ?? globalThis.chrome;
  const host = location.hostname || "local";
  const STYLE_ID = "__tcp_dark_style";
  const FLIP = "invert(1) hue-rotate(180deg)";
  const DARK_CSS = `
    html { filter: ${FLIP} !important; background-color: #fff !important; }
    img, picture, video, canvas, embed, object, iframe, svg image,
    [style*="background-image"] { filter: ${FLIP} !important; }
  `;


  function applyDark(on) {
    let s = document.getElementById(STYLE_ID);
    if (on && !s) {
      s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = DARK_CSS;
      document.documentElement.appendChild(s);
    } else if (!on && s) {
      s.remove();
    }
    const p = document.getElementById("__tcp_picker");
    if (p) p.style.filter = on ? FLIP : "";
  }

  async function resolveTheme() {
    const { theme } = await api.storage.local.get({ theme: null });
    return { mode: theme };
  }

  let mode = null;       
  let nativeDark = false;

  const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;

  function measureNative() {
    const html = document.documentElement;
    const body = document.body;
    if (!body) return nativeDark;
    const style = document.getElementById(STYLE_ID);
    if (style) style.disabled = true; 
    try {
      let el = document.elementFromPoint(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));
      if (!el || el.id === "__tcp_picker") el = body;
      for (; el; el = el.parentElement) {
        const c = parseCss(getComputedStyle(el).backgroundColor);
        if (c && c.a > 0.5) return lum(c) < 0.5;
      }
      const cs = (getComputedStyle(html).colorScheme || "").trim();
      if (cs.includes("dark")) {
        return cs.startsWith("dark") || matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    } finally {
      if (style) style.disabled = false;
    }
  }

  const browserDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

  const targetDark = () => (mode ? mode === "dark" : browserDark());
  const render = () => applyDark(targetDark() !== nativeDark);

  async function refresh() {
    try { mode = (await resolveTheme()).mode; } catch { return; }
    nativeDark = measureNative();
    render();
  }
  const remeasure = () => { nativeDark = measureNative(); render(); };

  refresh();
  document.addEventListener("DOMContentLoaded", remeasure);
  window.addEventListener("load", () => { remeasure(); setTimeout(remeasure, 1500); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", remeasure);
  api.storage.onChanged.addListener(refresh);

  api.runtime.onMessage.addListener((msg, _sender, send) => {
    if (msg.type === "getTheme") {
      resolveTheme().then((s) => send({ host, mode: s.mode, browserDark: browserDark(), nativeDark: measureNative(), pickerOpen: !!document.getElementById("__tcp_picker") }));
      return true;
    }
    if (msg.type === "setTheme") {
      (async () => {
        await api.storage.local.set({ theme: msg.auto ? null : msg.dark ? "dark" : "light" });
        send({ ok: true });
      })();
      return true;
    }
    if (msg.type === "closePicker") {
      document.getElementById("__tcp_picker")?.remove();
      send({ ok: true });
    }
    if (msg.type === "startPicker") {
      startPicker();
      send({ ok: true });
    }
  });

  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (r, g, b) =>
    "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("").toUpperCase();

  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  function parseCss(str) {
    const m = str && str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function bgColorOf(el) {
    for (let e = el; e; e = e.parentElement) {
      const c = parseCss(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.05) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  async function saveHistory(hex) {
    const { history } = await api.storage.local.get({ history: [] });
    const next = [hex, ...history.filter((x) => x !== hex)].slice(0, 12);
    await api.storage.local.set({ history: next });
  }

  function startPicker() {
    if (document.getElementById("__tcp_picker")) return;

    const hostEl = document.createElement("div");
    hostEl.id = "__tcp_picker";
    hostEl.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:16px;right:16px;";
    const root = hostEl.attachShadow({ mode: "closed" });
    const hasEye = "EyeDropper" in window;

    root.innerHTML = `
      <style>
        *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
        .p{width:280px;background:#1b1d23;color:#eef0f4;border-radius:12px;padding:12px;
           box-shadow:0 10px 30px rgba(0,0,0,.45);font-size:13px}
        .row{display:flex;gap:8px;align-items:center;justify-content:space-between}
        h1{font-size:14px;margin:0;font-weight:600}
        button{font:inherit;cursor:pointer;border:0;border-radius:8px;padding:8px 10px;
               background:#2c3039;color:inherit}
        button:hover{background:#3a3f4b}
        button:focus-visible{outline:2px solid #6ea8ff;outline-offset:2px}
        .modes{margin:10px 0;display:grid;grid-template-columns:1fr;gap:8px}
        .modes button{padding:10px 6px}
        .note{color:#9aa1b0;font-size:12px;margin:8px 0}
        .res{margin-top:8px;display:grid;gap:8px;max-height:278px;overflow-y:auto;overflow-x:hidden;padding-right:4px;scrollbar-width:thin}
        .res::-webkit-scrollbar{width:6px}
        .res::-webkit-scrollbar-thumb{background:#3a3f4b;border-radius:3px}
        .item{background:#252831;border-radius:8px;padding:8px}
        .item .top{display:flex;gap:8px;align-items:center;margin-bottom:6px}
        .sw{width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,.25)}
        .vals{display:flex;gap:6px;flex-wrap:wrap}
        .vals button{padding:4px 7px;font-size:12px;font-variant-numeric:tabular-nums}
        .toast{color:#7ee0a0;min-height:16px;font-size:12px;margin-top:6px}
      </style>
      <div class="p" role="dialog" aria-label="Color picker">
        <div class="row"><h1>Cuentagotas</h1><button id="x" aria-label="Cerrar">✕</button></div>
        <div class="modes">
          <button id="eye" ${hasEye ? "" : "disabled"}>Elegir color de pantalla</button>
        </div>
        <div class="note">${hasEye
          ? "Haz clic en el botón y luego en cualquier punto de la pantalla."
          : "Tu navegador no soporta el cuentagotas de pantalla (por ejemplo, Firefox). Usa Chrome, Edge u Opera."}</div>
        <div class="res" id="res"></div>
        <div class="toast" id="toast"></div>
      </div>`;
    document.documentElement.appendChild(hostEl);
    if (document.getElementById(STYLE_ID)) hostEl.style.filter = FLIP;

    const $ = (id) => root.getElementById(id);
    const toast = (t) => { $("toast").textContent = t; setTimeout(() => ($("toast").textContent = ""), 1500); };

    async function copy(text) {
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      toast("Copiado: " + text);
    }

    function addResult(label, c) {
      const hex = toHex(c.r, c.g, c.b);
      const rgb = `rgb(${clamp(c.r)}, ${clamp(c.g)}, ${clamp(c.b)})`;
      const hsl = toHsl(c.r, c.g, c.b);
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<div class="top"><div class="sw" style="background:${hex}"></div><b>${label}</b></div>
        <div class="vals"></div>`;
      [hex, rgb, hsl].forEach((v) => {
        const b = document.createElement("button");
        b.textContent = v;
        b.title = "Copiar";
        b.onclick = () => copy(v);
        item.querySelector(".vals").appendChild(b);
      });
      $("res").prepend(item);
      saveHistory(hex);
      copy(hex);
    }

    $("x").onclick = () => hostEl.remove();
    $("eye").onclick = async () => {
      try {
        const r = await new window.EyeDropper().open();
        addResult("Píxel", hexToRgb(r.sRGBHex));
      } catch { }
    };

  }
})();
