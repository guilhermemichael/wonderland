// Minimal Chrome DevTools Protocol driver (Node 22+, zero dependencies).
// Recipe from references/troubleshooting.md: headless Chrome + global WebSocket.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

export async function launch({ port = 9333, width = 1440, height = 900 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "wl-cdp-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--hide-scrollbars",
      "--autoplay-policy=no-user-gesture-required",
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${width},${height}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (targets.find((t) => t.type === "page")) break;
    } catch {}
    await sleep(250);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      (listeners.get(msg.method) ?? []).forEach((fn) => fn(msg.params));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      const timer = setTimeout(() => {
        pending.delete(mid);
        reject(new Error(`CDP timeout: ${method}`));
      }, 30000);
      pending.set(mid, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const on = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]);

  const logs = [];
  on("Runtime.consoleAPICalled", (p) => logs.push(`[${p.type}] ${p.args.map((a) => a.value ?? a.description).join(" ")}`));
  on("Runtime.exceptionThrown", (p) => logs.push(`[exception] ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`));
  on("Log.entryAdded", (p) => logs.push(`[${p.entry.level}] ${p.entry.text} ${p.entry.url ?? ""}`));
  const requests = [];
  on("Network.requestWillBeSent", (p) => requests.push(p.request.url));

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");

  const api = {
    send,
    on,
    logs,
    requests,
    async viewport(w, h, { mobile = false, dpr = 1, touch = false } = {}) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: 5 });
    },
    async media(features) {
      await send("Emulation.setEmulatedMedia", { features });
    },
    async block(patterns) {
      await send("Network.setBlockedURLs", { urls: patterns });
    },
    async go(url, wait = 2500) {
      const loaded = new Promise((r) => on("Page.loadEventFired", r));
      await send("Page.navigate", { url });
      await Promise.race([loaded, sleep(15000)]);
      await sleep(wait);
    },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(file, clip) {
      const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 82, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(file, Buffer.from(r.data, "base64"));
    },
    async wheel(dy, x = 700, y = 450) {
      await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: dy });
    },
    async mouse(type, x, y) {
      await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    },
    async key(key, code, keyCode) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
    },
    async close() {
      try {
        await Promise.race([send("Browser.close"), sleep(3000)]);
      } catch {}
      ws.close();
      for (const entry of pending.values()) clearTimeout(entry.timer);
      pending.clear();
      proc.kill();
    },
  };
  return api;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
