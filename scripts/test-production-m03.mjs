import assert from "node:assert/strict";
import { test } from "node:test";

const configuredBase = process.env.PRODUCTION_API_URL;
const base = configuredBase ? `${configuredBase.replace(/\/$/, "")}/api/v1` : null;

async function request(method, path, payload, expected = [200]) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert.ok(expected.includes(response.status), `${method} ${path}: expected ${expected.join(",")}, got ${response.status}: ${text}`);
  return data;
}

test("M03 production API persists Cheshire divergence and serves authoritative result", { skip: !base }, async () => {
  const session = await request("POST", "/sessions", {
    campaign_slug: "wonderland",
    locale: "m03-production-gate",
  }, [201]);
  const sessionId = session.public_session_id;
  assert.ok(sessionId);

  const selected = await request("PATCH", `/sessions/${sessionId}`, { selected_path: "cheshire" });
  assert.equal(selected.selected_path, "cheshire");
  assert.equal(selected.entry_affinity, "mysterious");

  const answers = {
    q1: "q1_a",
    q2: "q2_a",
    q3: "q3_a",
    q4: "q4_a",
  };

  for (const [questionId, answerId] of Object.entries(answers)) {
    await request("POST", `/sessions/${sessionId}/quiz/answers`, {
      question_id: questionId,
      answer_id: answerId,
    });
  }

  const progress = await request("GET", `/sessions/${sessionId}/quiz/answers`);
  assert.equal(progress.total_answered, 4);
  assert.equal(progress.is_complete, true);

  const submitted = await request("POST", `/sessions/${sessionId}/quiz/submit`);
  assert.equal(submitted.final_segment, "curious");
  assert.equal(submitted.curious_score, 11);

  const result = await request("GET", `/sessions/${sessionId}/quiz/result`);
  assert.equal(result.final_segment, "curious");
  assert.equal(result.curious_score, 11);
  assert.equal(result.chaotic_score, 0);
  assert.equal(result.mysterious_score, 0);
  assert.equal(Number(result.confidence), 1);
  assert.ok(result.scoring_version);

  const recoveredSession = await request("GET", `/sessions/${sessionId}`);
  assert.equal(recoveredSession.selected_path, "cheshire");
  assert.equal(recoveredSession.entry_affinity, "mysterious");
  assert.equal(recoveredSession.final_segment, "curious");

  const resultAgain = await request("GET", `/sessions/${sessionId}/quiz/result`);
  assert.deepEqual(resultAgain, result);
});
