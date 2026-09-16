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
  const event = { event_name: "cta_click", page: "/", session_id: "00000000-0000-0000-0000-000000000001", client_sequence: 1, occurred_at: new Date().toISOString(), properties: { cta: "follow_the_white_rabbit" } };
  const first = await fetch("http://127.0.0.1:8001/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) });
  const duplicate = await fetch("http://127.0.0.1:8001/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) });
  if (first.status !== 202 || duplicate.status !== 202) throw new Error(`Unexpected event status: ${first.status}/${duplicate.status}`);
  const [firstBody, duplicateBody] = await Promise.all([first.json(), duplicate.json()]);
  if (firstBody.event_id !== duplicateBody.event_id) throw new Error("Duplicate event was not idempotent.");
  console.log("API smoke test passed: health, event ingestion and duplicate idempotency.");
} finally {
  server.kill("SIGTERM");
}
