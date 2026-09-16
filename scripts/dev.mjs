import { spawn } from "node:child_process";
import { ensureApiEnvironment, root } from "./ensure-api.mjs";

const python = ensureApiEnvironment();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const api = spawn(python, ["-m", "uvicorn", "main:app", "--host", process.env.API_HOST ?? "0.0.0.0", "--port", process.env.API_PORT ?? "8000", "--reload"], { cwd: `${root}/apps/api`, stdio: "inherit", env: { ...process.env } });
const web = spawn(npm, ["--workspace", "apps/web", "run", "dev", "--", "-H", "127.0.0.1"], { cwd: root, stdio: "inherit", env: { ...process.env } });

function shutdown(code = 0) {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
api.on("exit", (code) => { if (code && code !== 143) shutdown(code); });
web.on("exit", (code) => { if (code && code !== 143) shutdown(code); });
