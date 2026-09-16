import { spawn } from "node:child_process";
import { ensureApiEnvironment, root } from "./ensure-api.mjs";

const python = ensureApiEnvironment();
const server = spawn(python, ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8001"], { cwd: `${root}/apps/api`, stdio: "ignore" });

async function waitForHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8001/api/v1/health");
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("API health endpoint did not become available.");
}

try {
  await waitForHealth();
  const endpoint = "http://127.0.0.1:8001/api/v1/events";
  const base = { event_name: "cta_click", page: "/", session_id: "00000000-0000-0000-0000-000000000001", client_sequence: 1, occurred_at: new Date().toISOString(), properties: { cta: "follow_the_white_rabbit" } };
  const eventA = { ...base, client_event_id: "00000000-0000-0000-0000-000000000011" };
  const eventB = { ...base, client_event_id: "00000000-0000-0000-0000-000000000012" };
  const send = (event) => fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) });
  const [first, duplicate] = await Promise.all([send(eventA), send(eventA)]);
  if (first.status !== 202 || duplicate.status !== 202) throw new Error(`Unexpected event status: ${first.status}/${duplicate.status}`);
  const [firstBody, duplicateBody] = await Promise.all([first.json(), duplicate.json()]);
  if (firstBody.event_id !== duplicateBody.event_id) throw new Error("Duplicate event was not idempotent.");
  const second = await send(eventB);
  if (second.status !== 202 || (await second.json()).event_id === firstBody.event_id) throw new Error("Distinct client_event_id values were conflated.");
  const reloadAction = await send({ ...base, client_event_id: "00000000-0000-0000-0000-000000000013", client_sequence: 1 });
  if (reloadAction.status !== 202) throw new Error("Sequence reset was incorrectly rejected or conflated.");
  const invalid = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base }) });
  if (invalid.status !== 422) throw new Error(`Expected validation failure, received ${invalid.status}`);
  console.log("API smoke test passed: health, validation, distinct events, concurrent retry idempotency and reload-safe sequencing.");
} finally {
  server.kill("SIGTERM");
}
