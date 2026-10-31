const api = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);
let tabId = null;

function showTheme(mode, browserDark) {
  setMode(mode ? mode === "dark" : browserDark);
  $("autoNote").hidden = mode !== null;
  $("autoBtn").hidden = mode === null;
}

function setMode(dark) {
  $("track").dataset.mode = dark ? "dark" : "light";
  $("darkBtn").setAttribute("aria-pressed", String(dark));
  $("lightBtn").setAttribute("aria-pressed", String(!dark));
}

const trySend = (msg) =>
  new Promise((resolve) => {
    api.tabs.sendMessage(tabId, msg).then(resolve, () => resolve(null));
  });

let injected = false;
async function send(msg) {
  let res = await trySend(msg);
  if (res === null && !injected) {
   
    injected = true;
    try {
      await api.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      res = await trySend(msg);
    } catch {  }
  }
  return res;
}

function toast(t) {
  $("toast").textContent = t;
  setTimeout(() => ($("toast").textContent = ""), 1500);
}

async function renderHistory() {
  const stored = await api.storage.local.get({ history: [] });
  const history = stored.history.slice(0, 12);
  const box = $("history");
  box.replaceChildren();
  $("empty").hidden = history.length > 0;
  history.forEach((hex) => {
    const b = document.createElement("button");
    b.style.background = hex;
    b.title = hex;
    b.setAttribute("aria-label", "Copiar " + hex);
    b.onclick = async () => {
      await navigator.clipboard.writeText(hex);
      toast("Copiado: " + hex);
    };
    box.appendChild(b);
  });
}

async function init() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  renderHistory();

  const state = tabId != null ? await send({ type: "getTheme" }) : null;
  if (!state) {
    $("controls").hidden = true;
    $("unavailable").hidden = false;
    $("site").textContent = "No disponible aquí";
    return;
  }

  if (state.pickerOpen) {
    await send({ type: "closePicker" });
    window.close();
    return;
  }
  $("site").textContent = state.host;
  showTheme(state.mode, state.browserDark);

  const choose = (dark) => {
    showTheme(dark ? "dark" : "light", state.browserDark);
    send({ type: "setTheme", dark });
  };
  $("autoBtn").onclick = () => {
    showTheme(null, state.browserDark);
    send({ type: "setTheme", auto: true });
  };
  $("darkBtn").onclick = () => choose(true);
  $("lightBtn").onclick = () => choose(false);
  $("pick").onclick = async () => {
    await send({ type: "startPicker" });
    window.close();
  };
}

$("clear").onclick = async () => {
  await api.storage.local.set({ history: [] });
  renderHistory();
};
init();
