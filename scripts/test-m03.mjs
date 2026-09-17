import assert from "node:assert/strict";
import { after, test } from "node:test";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const base = process.env.WEB_URL ?? "http://127.0.0.1:3000";
after(() => browser.close());
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await pause(100); }
  assert.fail("Timed out waiting for condition");
}

async function fixture(path = "/") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const sent = [], accepted = [];
  page.on("request", (request) => { 
    if (request.method() === "POST" && request.url().endsWith("/events")) sent.push(request.postDataJSON()); 
  });
  page.on("response", (response) => { 
    if (response.request().method() === "POST" && response.url().endsWith("/events") && response.status() === 202) accepted.push(response.request().postDataJSON()); 
  });
  await page.goto(base + path);
  await page.waitForTimeout(1200);
  const pending = () => page.evaluate(() => JSON.parse(localStorage.getItem("wonderland_event_queue") ?? "[]"));
  const getSessionId = () => page.evaluate(() => localStorage.getItem("wonderland_session_id"));
  return { context, page, sent, accepted, pending, getSessionId };
}

test("E2E Different Affinity", async () => {
  const f = await fixture("/crossroads");
  try {
    await f.page.locator('.path-zone[data-path="cheshire"] .path-link').click();
    await f.page.waitForTimeout(1000);
    
    // In /cheshire, start quiz
    await f.page.getByRole("link", { name: "Ask the Cat" }).click();
    await f.page.waitForTimeout(1500);

    // Q1 - Curious
    await f.page.locator('label', { hasText: 'The door that is too small for me.' }).click();
    await f.page.getByRole("button", { name: "Continue" }).click();
    await f.page.waitForTimeout(1000);

    // Q2 - Curious
    await f.page.locator('label', { hasText: 'That depends a good deal on where I want to get to.' }).click();
    await f.page.getByRole("button", { name: "Continue" }).click();
    await f.page.waitForTimeout(1000);

    // Q3 - Curious
    await f.page.locator('label', { hasText: 'Move down to the next seat.' }).click();
    await f.page.getByRole("button", { name: "Continue" }).click();
    await f.page.waitForTimeout(1000);

    // Q4 - Chaotic
    await f.page.locator('label', { hasText: 'I am the one who painted the roses red.' }).click();
    await f.page.getByRole("button", { name: "Let the Cat decide" }).click();
    await f.page.waitForTimeout(2000);

    // Should be on result page with Curious
    await f.page.screenshot({ path: 'screenshot.png' });
    const resultText = await f.page.locator('.hero-title').innerText();
    assert.match(resultText, /Curious/i);
    
    // Verify analytics
    try {
      await until(() => f.sent.flat().some(e => e.event_name === "quiz_result_viewed" && e.properties?.affinity === "curious"));
    } catch (err) {
      console.log("Analytics events captured:", JSON.stringify(f.sent, null, 2));
      throw err;
    }
  } finally { await f.context.close(); }
});

test("E2E Result Resume", async () => {
  const f = await fixture("/crossroads");
  try {
    await f.page.locator('.path-zone[data-path="cheshire"] .path-link').click();
    await f.page.waitForTimeout(1000);
    
    // In /cheshire, start quiz
    await f.page.getByRole("link", { name: "Ask the Cat" }).click();
    await f.page.waitForTimeout(1000);

    // Answer Q1 only
    await f.page.locator('label', { hasText: 'The door that is too small for me.' }).click();
    await f.page.getByRole("button", { name: "Continue" }).click();
    await f.page.waitForTimeout(1000);
    
    // Now close and resume
    const sessionId = await f.getSessionId();
    await f.page.close();
    
    // Open new page but keep session ID (actually, we can just goto in the same context to simulate refresh)
    const page2 = await f.context.newPage();
    await page2.goto(base + "/cheshire/quiz");
    await page2.waitForTimeout(1500);
    
    // Should be on Question 2
    const currentQ = await page2.locator('.eyebrow').innerText();
    assert.match(currentQ, /Question 2 of 4/i);
    
  } finally { await f.context.close(); }
});

test("E2E Error Path", async () => {
  const f = await fixture("/crossroads");
  try {
    await f.page.locator('.path-zone[data-path="cheshire"] .path-link').click();
    await f.page.waitForTimeout(1000);
    
    // In /cheshire, start quiz
    await f.page.getByRole("link", { name: "Ask the Cat" }).click();
    await f.page.waitForTimeout(1000);

    // Simulate API failure on answers route
    await f.page.route("**/api/v1/sessions/**/quiz/answers", route => {
      if (route.request().method() === "POST") {
        route.abort("failed");
      } else {
        route.continue();
      }
    });

    // Select Q1 and try to continue
    await f.page.locator('label', { hasText: 'The door that is too small for me.' }).click();
    await f.page.getByRole("button", { name: "Continue" }).click();
    await f.page.waitForTimeout(1000);
    
    // Should see error banner and still be on Q1
    const banner = await f.page.locator('.error-banner');
    assert.ok(await banner.isVisible());
    
    const currentQ = await f.page.locator('.eyebrow').innerText();
    assert.match(currentQ, /Question 1 of 4/i);
    
  } finally { await f.context.close(); }
});
