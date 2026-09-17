import assert from "node:assert/strict";
import { after, test } from "node:test";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
});

const webBase = process.env.WEB_URL ?? "http://127.0.0.1:3000";
const apiBase = (process.env.API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

after(() => browser.close());

async function until(predicate, message = "Timed out waiting for condition") {
  for (let i = 0; i < 120; i += 1) {
    if (await predicate()) return;
    await pause(100);
  }
  assert.fail(message);
}

async function api(method, path, payload, expected = [200]) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert.ok(expected.includes(response.status), `${method} ${path}: expected ${expected.join(",")}, got ${response.status}: ${text}`);
  return data;
}

async function createRabbitSession() {
  const session = await api("POST", "/sessions", { campaign_slug: "wonderland", locale: "m04-e2e" }, [201]);
  const patched = await api("PATCH", `/sessions/${session.public_session_id}`, { selected_path: "rabbit" });
  assert.equal(patched.selected_path, "rabbit");
  return session.public_session_id;
}

async function browserFixture(path = "/", options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion,
  });

  if (options.sessionId) {
    await context.addInitScript((sessionId) => {
      window.localStorage.setItem("wonderland_session_id", sessionId);
    }, options.sessionId);
  }

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.goto(webBase + path);
  await page.waitForLoadState("domcontentloaded");
  return { context, page };
}

async function getSessionId(page) {
  await until(
    () => page.evaluate(() => Boolean(localStorage.getItem("wonderland_session_id"))),
    "Session bootstrap did not complete",
  );
  return page.evaluate(() => localStorage.getItem("wonderland_session_id"));
}

test("M04 follows the white rabbit trail and persists state", async () => {
  const { context, page } = await browserFixture("/crossroads");
  try {
    const sessionId = await getSessionId(page);
    await page.locator('.path-zone[data-path="rabbit"] .path-link').click();
    await page.waitForURL("**/rabbit");

    await page.getByText(/Curious, aren't you?/i).waitFor();

    // The component sets phase to 'watch' after 3 seconds. Let's wait for it.
    await page.getByRole("button", { name: "Take the Watch" }).waitFor({ timeout: 5000 });
    
    // Verify backend hasn't advanced
    let state = await api("GET", `/sessions/${sessionId}/rabbit`);
    assert.equal(state.has_taken_watch, false);

    await page.getByRole("button", { name: "Take the Watch" }).click();

    await page.getByRole("button", { name: "Step forward" }).waitFor();

    // Verify backend took the watch
    state = await api("GET", `/sessions/${sessionId}/rabbit`);
    assert.equal(state.has_taken_watch, true);
    assert.equal(state.has_followed_trail, false);

    // Reload the page and see if we resume at trail
    await page.reload();
    await page.getByRole("button", { name: "Step forward" }).waitFor();

    await page.getByRole("button", { name: "Step forward" }).click();

    await page.getByRole("button", { name: "Enter" }).waitFor();
    
    // Verify backend followed the trail
    state = await api("GET", `/sessions/${sessionId}/rabbit`);
    assert.equal(state.has_followed_trail, true);
    assert.equal(state.has_reached_threshold, true);

    await page.getByRole("button", { name: "Enter" }).click();
    await page.waitForURL("**/crossroads");
  } finally {
    await context.close();
  }
});
