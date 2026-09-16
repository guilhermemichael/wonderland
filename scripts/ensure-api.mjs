import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const venvDir = resolve(root, ".venv");
const isWindows = process.platform === "win32";
const pythonBin = isWindows ? resolve(venvDir, "Scripts", "python.exe") : resolve(venvDir, "bin", "python");
const pipRequirements = resolve(root, "apps", "api", "requirements.txt");
const marker = resolve(venvDir, ".wonderland-api-installed");

const envFile = resolve(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function systemPython() {
  for (const candidate of isWindows ? ["python"] : ["python3", "python"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch { /* try the next executable */ }
  }
  throw new Error("Python 3 was not found. Install Python 3.11+ and run npm run dev again.");
}

export function ensureApiEnvironment() {
  if (!existsSync(pythonBin)) {
    mkdirSync(dirname(pythonBin), { recursive: true });
    execFileSync(systemPython(), ["-m", "venv", venvDir], { stdio: "inherit" });
  }
  if (!existsSync(marker)) {
    execFileSync(pythonBin, ["-m", "pip", "install", "-r", pipRequirements], { stdio: "inherit" });
    writeFileSync(marker, new Date().toISOString());
  }
  return pythonBin;
}

export { root };
