import { spawn } from "node:child_process";
import { ensureApiEnvironment, root } from "./ensure-api.mjs";

const python = ensureApiEnvironment();
const api = spawn(python, ["-m", "uvicorn", "main:app", "--host", process.env.API_HOST ?? "0.0.0.0", "--port", process.env.API_PORT ?? "8000", "--reload"], {
  cwd: `${root}/apps/api`,
  stdio: "inherit",
  env: { ...process.env },
});
api.on("exit", (code) => process.exit(code ?? 0));
