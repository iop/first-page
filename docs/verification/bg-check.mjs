const targets = await (await fetch("http://127.0.0.1:9334/json")).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.result.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scheme = process.argv[2];
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:5174/" });
await sleep(1800);
console.log(scheme, JSON.stringify({
  htmlClass: await evalJs(`document.documentElement.className`),
  bodyBg: await evalJs(`getComputedStyle(document.body).backgroundColor`),
  cardBg: await evalJs(`getComputedStyle(document.querySelector('[data-slot="card"]')).backgroundColor`),
  cardRing: await evalJs(`getComputedStyle(document.querySelector('[data-slot="card"]')).boxShadow`),
}));
ws.close();
