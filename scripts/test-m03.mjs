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

async function createCheshireSession() {
  const session = await api("POST", "/sessions", { campaign_slug: "wonderland", locale: "m03-e2e" }, [201]);
  const patched = await api("PATCH", `/sessions/${session.public_session_id}`, { selected_path: "cheshire" });
  assert.equal(patched.selected_path, "cheshire");
  assert.equal(patched.entry_affinity, "mysterious");
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

async function chooseCheshire(page) {
  await getSessionId(page);
  await page.locator('.path-zone[data-path="cheshire"] .path-link').click();
  await page.waitForURL("**/cheshire");
}

async function startQuiz(page) {
  await page.getByRole("link", { name: "Ask the Cat" }).click();
  await page.waitForURL("**/cheshire/quiz");
  await page.getByText(/Question 1 of 4/i).waitFor();
}

async function choose(page, value, actionName = "Continue") {
  const radio = page.locator(`input[type="radio"][value="${value}"]`);
  await radio.check();
  await page.getByRole("button", { name: actionName }).click();
}

async function answerCuriousThroughQ2(page) {
  await choose(page, "q1_a");
  await page.getByText(/Question 2 of 4/i).waitFor();
  await choose(page, "q2_a");
  await page.getByText(/Question 3 of 4/i).waitFor();
}

test("M03 resumes Q1/Q2, preserves mysterious entry affinity, submits Curious result, and survives reload", async () => {
  const { context, page } = await browserFixture("/crossroads");
  try {
    await chooseCheshire(page);
    const sessionId = await getSessionId(page);
    await startQuiz(page);

    await answerCuriousThroughQ2(page);
    await page.reload();
    await page.getByText(/Question 3 of 4/i).waitFor();

    const recovered = await api("GET", `/sessions/${sessionId}/quiz/answers`);
    assert.equal(recovered.answers.q1, "q1_a");
    assert.equal(recovered.answers.q2, "q2_a");

    await choose(page, "q3_a");
    await page.getByText(/Question 4 of 4/i).waitFor();
    await choose(page, "q4_a", "Let the Cat decide");
    await page.waitForURL("**/cheshire/result");

    await page.getByRole("heading", { name: /Curious\./i }).waitFor();
    assert.match(await page.locator(".result-journey-line").innerText(), /mystery.*curiosity/i);

    const state = await api("GET", `/sessions/${sessionId}`);
    assert.equal(state.selected_path, "cheshire");
    assert.equal(state.entry_affinity, "mysterious");
    assert.equal(state.final_segment, "curious");

    const firstResult = await api("GET", `/sessions/${sessionId}/quiz/result`);
    assert.equal(firstResult.final_segment, "curious");
    assert.equal(firstResult.curious_score, 11);

    await page.reload();
    await page.getByRole("heading", { name: /Curious\./i }).waitFor();
    const reloadedResult = await api("GET", `/sessions/${sessionId}/quiz/result`);
    assert.deepEqual(reloadedResult, firstResult);

    await page.goto(webBase + "/cheshire/result");
    await page.getByRole("heading", { name: /Curious\./i }).waitFor();

    await page.getByRole("button", { name: "Begin a new journey" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    const newSessionId = await getSessionId(page);
    assert.notEqual(newSessionId, sessionId, "Replay must create a new authoritative server session");

    const historicalResult = await api("GET", `/sessions/${sessionId}/quiz/result`);
    assert.equal(historicalResult.final_segment, "curious", "Replay must preserve the completed server history");
  } finally {
    await context.close();
  }
});

test("M03 distinguishes four saved answers from an authoritative final submission", async () => {
  const sessionId = await createCheshireSession();
  for (const [questionId, answerId] of Object.entries({ q1: "q1_a", q2: "q2_a", q3: "q3_a", q4: "q4_a" })) {
    await api("POST", `/sessions/${sessionId}/quiz/answers`, { question_id: questionId, answer_id: answerId });
  }

  const { context, page } = await browserFixture("/cheshire/quiz", { sessionId });
  try {
    await page.getByText(/Question 4 of 4/i).waitFor();
    assert.equal(await page.locator('input[value="q4_a"]').isChecked(), true);
    await page.getByRole("button", { name: "Let the Cat decide" }).click();
    await page.waitForURL("**/cheshire/result");
    await page.getByRole("heading", { name: /Curious\./i }).waitFor();
  } finally {
    await context.close();
  }
});

test("M03 renders same-affinity Mysterious resonance from authoritative state", async () => {
  const sessionId = await createCheshireSession();
  for (const [questionId, answerId] of Object.entries({ q1: "q1_c", q2: "q2_c", q3: "q3_c", q4: "q4_c" })) {
    await api("POST", `/sessions/${sessionId}/quiz/answers`, { question_id: questionId, answer_id: answerId });
  }
  const result = await api("POST", `/sessions/${sessionId}/quiz/submit`);
  assert.equal(result.final_segment, "mysterious");

  const { context, page } = await browserFixture("/cheshire/result", { sessionId });
  try {
    await page.getByRole("heading", { name: /Mysterious\./i }).waitFor();
    assert.match(await page.locator(".result-journey-line").innerText(), /same language/i);
    const state = await api("GET", `/sessions/${sessionId}`);
    assert.equal(state.entry_affinity, "mysterious");
    assert.equal(state.final_segment, "mysterious");
  } finally {
    await context.close();
  }
});

test("M03 answer-save failure never advances and remains retryable", async () => {
  const sessionId = await createCheshireSession();
  const { context, page } = await browserFixture("/cheshire/quiz", { sessionId });
  try {
    await page.getByText(/Question 1 of 4/i).waitFor();
    await page.route("**/api/v1/sessions/**/quiz/answers", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });

    await page.locator('input[value="q1_a"]').check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.locator(".eyebrow").innerText(), /Question 1 of 4/i);

    await page.unroute("**/api/v1/sessions/**/quiz/answers");
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText(/Question 2 of 4/i).waitFor();
  } finally {
    await context.close();
  }
});

test("M03 invalid result route is controlled and never fabricates a result", async () => {
  const { context, page } = await browserFixture("/cheshire/result");
  try {
    await page.waitForURL("**/crossroads");
    assert.match(new URL(page.url()).pathname, /\/crossroads$/);
  } finally {
    await context.close();
  }
});

test("M03 mobile reduced-motion quiz remains usable with keyboard activation and no horizontal overflow", async () => {
  const sessionId = await createCheshireSession();
  const { context, page } = await browserFixture("/cheshire/quiz", {
    sessionId,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });

  try {
    const answers = ["q1_c", "q2_c", "q3_c", "q4_c"];
    for (let index = 0; index < answers.length; index += 1) {
      const radio = page.locator(`input[value="${answers[index]}"]`);
      await radio.focus();
      await page.keyboard.press("Space");
      const actionName = index === answers.length - 1 ? "Let the Cat decide" : "Continue";
      const button = page.getByRole("button", { name: actionName });
      await button.focus();
      await page.keyboard.press("Enter");
      if (index < answers.length - 1) {
        await page.getByText(new RegExp(`Question ${index + 2} of 4`, "i")).waitFor();
      }
    }

    await page.waitForURL("**/cheshire/result");
    await page.getByRole("heading", { name: /Mysterious\./i }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    assert.equal(overflow, false, "390px viewport must not have horizontal overflow");
  } finally {
    await context.close();
  }
});
