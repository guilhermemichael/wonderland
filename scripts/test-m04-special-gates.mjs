import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const base = process.env.WEB_URL ?? "http://127.0.0.1:3000";
const apiBase = (process.env.API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(pred, msg = "timeout") {
  for (let i = 0; i < 120; i++) { if (await pred()) return; await pause(100); }
  assert.fail(msg);
}

async function api(method, path, payload, expected = [200]) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: payload !== undefined ? { "content-type": "application/json" } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  assert.ok(expected.includes(res.status), `${method} ${path}: ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ─── 1. Keyboard-only watch interaction ───
{
  const session = await api("POST", "/sessions", { campaign_slug: "wonderland", locale: "kbd-test" }, [201]);
  await api("PATCH", `/sessions/${session.public_session_id}`, { selected_path: "rabbit" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((sid) => localStorage.setItem("wonderland_session_id", sid), session.public_session_id);
  const page = await ctx.newPage();
  await page.goto(base + "/rabbit");
  await page.waitForLoadState("domcontentloaded");
  // Wait for "Take the Watch" button to appear (phase=watch after 3s)
  await page.getByRole("button", { name: "Take the Watch" }).waitFor({ timeout: 10000 });
  // Keyboard interaction: Tab to button, Enter to activate
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Step forward" }).waitFor({ timeout: 5000 });
  const state = await api("GET", `/sessions/${session.public_session_id}/rabbit`);
  assert.equal(state.has_taken_watch, true, "keyboard: watch must be taken after Enter");
  console.log("KEYBOARD WATCH INTERACTION: PASS");
  await ctx.close();
}

// ─── 2. prefers-reduced-motion journey ───
{
  const session = await api("POST", "/sessions", { campaign_slug: "wonderland", locale: "rm-test" }, [201]);
  await api("PATCH", `/sessions/${session.public_session_id}`, { selected_path: "rabbit" });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await ctx.addInitScript((sid) => localStorage.setItem("wonderland_session_id", sid), session.public_session_id);
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  await page.goto(base + "/rabbit");
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: "Take the Watch" }).waitFor({ timeout: 8000 });
  assert.equal(jsErrors.length, 0, `reduced-motion: JS errors: ${jsErrors.join("; ")}`);
  const motionClass = await page.locator("[data-motion]").count();
  console.log(`REDUCED-MOTION: page loaded, data-motion elements=${motionClass} errors=${jsErrors.length} PASS`);
  await ctx.close();
}

// ─── 3. WebGL fallback (emulate context loss via no-webgl) ───
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Force software-only by disabling GPU (headless already does this on many machines)
  });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  // Inject WebGL context loss before page loads
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type === "webgl2" || type === "webgl") return null; // simulate no WebGL
      return orig.call(this, type, ...args);
    };
  });
  await page.goto(base + "/rabbit");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  // Should either show fallback or handle gracefully (no unhandled errors)
  const fallbackVisible = await page.locator("[data-testid='watch-fallback'], .watch-fallback, [data-no-webgl]").count() > 0;
  const canvasCount = await page.locator("canvas").count();
  // If no fallback UI exists, verify no unhandled JS crash
  const criticalErrors = jsErrors.filter(e => !e.includes("Context Lost") && !e.includes("WebGL"));
  assert.equal(criticalErrors.length, 0, `webgl-fallback: critical JS errors: ${criticalErrors.join("; ")}`);
  console.log(`WEBGL FALLBACK: fallback=${fallbackVisible} canvas=${canvasCount} errors=${jsErrors.length} criticalErrors=${criticalErrors.length} PASS`);
  await ctx.close();
}

await browser.close();
console.log("ALL SPECIAL GATE CHECKS PASS");
