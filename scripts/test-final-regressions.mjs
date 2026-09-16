import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

// Run against a production build and the real local API; no synthetic ACKs.
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const base = process.env.WEB_URL ?? "http://127.0.0.1:3000";
if (process.env.EVIDENCE_DIR) await mkdir(process.env.EVIDENCE_DIR, { recursive: true });
after(() => browser.close());
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await pause(100); }
  assert.fail("Timed out waiting for regression acceptance condition");
}
async function fixture(path = "/") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const sent = [], accepted = [];
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/events")) sent.push(request.postDataJSON()); });
  page.on("response", (response) => { if (response.request().method() === "POST" && response.url().endsWith("/events") && response.status() === 202) accepted.push(response.request().postDataJSON()); });
  await page.goto(base + path);
  await page.waitForTimeout(1200);
  const pending = () => page.evaluate(() => JSON.parse(localStorage.getItem("wonderland_event_queue") ?? "[]"));
  return { context, page, sent, accepted, pending };
}

test("navbar Choose synchronously skips without fabricated traversal", async () => {
  const f = await fixture();
  try {
    await f.page.getByRole("link", { name: "Choose", exact: true }).click();
    await f.page.waitForTimeout(1500);
    assert.deepEqual(f.sent.map((event) => event.event_name), ["rabbit_hole_skipped"]);
    assert.equal(f.sent[0].properties.reason, "navigation_choose");
    await until(() => f.accepted.length === 1);
    assert.deepEqual(await f.pending(), []);
  } finally { await f.context.close(); }
});

test("internal skip retains the same semantics", async () => {
  const f = await fixture("/rabbit-hole");
  try {
    await f.page.locator(".skip-rabbit").click();
    await f.page.waitForTimeout(1500);
    assert.equal(f.sent.filter((e) => e.event_name === "rabbit_hole_skipped").length, 1);
    assert.equal(f.sent.filter((e) => ["scroll_depth", "rabbit_hole_completed"].includes(e.event_name)).length, 0);
  } finally { await f.context.close(); }
});

test("normal traversal delivers completion after depth 100 ACK and never retroactively skips", async () => {
  const f = await fixture();
  try {
    let releaseDepth;
    const depthHeld = new Promise((resolve) => { releaseDepth = resolve; });
    await f.page.route("**/api/v1/events", async (route) => {
      const event = route.request().postDataJSON();
      if (event.event_name === "scroll_depth" && event.properties.threshold === 100) await depthHeld;
      await route.continue();
    });
    await f.page.locator(".primary-cta").click();
    await f.page.waitForTimeout(1200);
    const geometry = await f.page.locator(".rabbit-hole").evaluate((element) => ({ top: element.getBoundingClientRect().top + scrollY, length: element.clientHeight - innerHeight }));
    await f.page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), geometry.top + 10);
    await until(() => f.accepted.some((event) => event.event_name === "rabbit_hole_started"));
    for (const fraction of [.26, .51, .76, 1]) {
      await f.page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), geometry.top + geometry.length * fraction);
      await f.page.waitForTimeout(350);
    }
    await until(async () => (await f.pending()).some((e) => e.event_name === "rabbit_hole_completed"));
    assert.equal(f.accepted.some((e) => e.event_name === "rabbit_hole_completed"), false);
    releaseDepth();
    await until(() => f.accepted.some((e) => e.event_name === "rabbit_hole_completed"));
    await until(async () => (await f.pending()).length === 0);
    await f.page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await f.page.getByRole("link", { name: "Choose", exact: true }).click();
    await f.page.waitForTimeout(1000);
    assert.equal(f.sent.some((e) => e.event_name === "rabbit_hole_skipped"), false);
    await f.page.locator('.path-zone[data-path="rabbit"] .path-link').click();
    await until(() => f.accepted.some((e) => e.event_name === "path_selected"));
    assert.deepEqual(f.accepted.map((e) => e.event_name === "scroll_depth" ? `scroll_depth ${e.properties.threshold}` : e.event_name), ["cta_click", "rabbit_hole_started", "scroll_depth 25", "scroll_depth 50", "scroll_depth 75", "scroll_depth 100", "rabbit_hole_completed", "path_selected"]);
    console.log("Normal flow: all eight events acknowledged by HTTP 202.");
  } finally { await f.context.close(); }
});

for (const trigger of ["online", "focus", "reload"]) test(`exhausted outage recovers on ${trigger}`, async () => {
  const f = await fixture();
  try {
    await f.page.route("**/api/v1/events", (route) => route.abort("connectionrefused"));
    await f.page.getByRole("link", { name: "Choose", exact: true }).click();
    await until(async () => (await f.pending())[0]?.attempts >= 3);
    const pending = await f.pending();
    const attempts = f.sent.length;
    await f.page.waitForTimeout(1500);
    assert.equal(f.sent.length, attempts, "no autonomous infinite retry");
    await f.page.unroute("**/api/v1/events");
    if (trigger === "reload") await f.page.reload();
    else await f.page.evaluate((name) => window.dispatchEvent(new Event(name)), trigger);
    await until(async () => (await f.pending()).length === 0);
    for (const event of pending) assert.ok(f.accepted.some((ack) => ack.client_event_id === event.client_event_id));
  } finally { await f.context.close(); }
});

function contrast(a, b) {
  const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
test("desktop hover and keyboard focus provide readable, equivalent states", async () => {
  const f = await fixture("/crossroads");
  try {
    for (const mode of ["hover", "keyboard"]) {
      await f.page.mouse.move(0, 0);
      if (mode === "keyboard") await f.page.reload();
      for (const path of ["rabbit", "hatter", "cheshire"]) {
        const zone = f.page.locator(`.path-zone[data-path="${path}"]`);
        if (mode === "hover") await zone.hover();
        else await f.page.keyboard.press("Tab");
        await f.page.waitForTimeout(350);
        const colors = await zone.evaluate((el) => {
          const css = (selector) => getComputedStyle(el.querySelector(selector));
          return { bg: getComputedStyle(el).backgroundColor, number: css(".path-number").color, description: css("p").color, cta: css("a").color, focus: css("a").outlineColor, width: css("a").outlineWidth, focused: el.contains(document.activeElement) };
        });
        assert.equal(colors.bg, "rgb(16, 21, 31)", `${path} ${mode} surface`);
        for (const role of ["number", "description", "cta"]) assert.ok(contrast(colors[role], colors.bg) >= 4.5, `${path} ${mode} ${role}: ${contrast(colors[role], colors.bg)}`);
        if (mode === "keyboard") { assert.ok(colors.focused); assert.equal(colors.width, "3px"); assert.ok(contrast(colors.focus, colors.bg) >= 3); }
        assert.ok((await zone.locator("a").boundingBox()).height >= 44);
        if (process.env.EVIDENCE_DIR) await f.page.screenshot({ path: join(process.env.EVIDENCE_DIR, `${path}-${mode}.png`) });
        console.log(`${path} ${mode}: number contrast ${contrast(colors.number, colors.bg).toFixed(2)}:1`);
      }
    }
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.reload();
    for (let i = 0; i < 4; i++) await f.page.keyboard.press("Tab");
    const light = await f.page.locator(".path-scene a").evaluate((element) => ({ focused: document.activeElement === element, outline: getComputedStyle(element).outlineColor, background: getComputedStyle(element.closest(".crossroads")).backgroundColor }));
    assert.ok(light.focused);
    assert.ok(contrast(light.outline, light.background) >= 3);
    console.log(`Ivory focus contrast ${contrast(light.outline, light.background).toFixed(2)}:1`);
  } finally { await f.context.close(); }
});
