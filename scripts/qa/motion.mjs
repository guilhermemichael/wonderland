// Captures the same resting scene at intervals, so the idle life can be
// measured: what moves, and by how much. node scripts/qa/motion.mjs <outDir> <url> [progress] [n] [gapMs]
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launch, sleep } from "./cdp.mjs";

const [, , out = ".qa", url = "http://127.0.0.1:4173/", p = "1", n = "6", gap = "1500"] = process.argv;
mkdirSync(out, { recursive: true });
const b = await launch({ width: 1440, height: 900, port: 9400 + Math.floor(Math.random() * 300) });
await b.viewport(1440, 900);
await b.go(url, 4000);
if (p !== "none") {
  await b.eval(
    `(() => { const t = document.querySelector('.track'); const r = t.offsetHeight - innerHeight; window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + ${p} * r, behavior: 'instant' }); })()`,
  );
  await sleep(2500);
}
for (let i = 0; i < Number(n); i++) {
  await b.shot(join(out, `motion-${i}.png`));
  await sleep(Number(gap));
}
console.log("done", b.logs.filter((l) => /error|exception/i.test(l)));
await b.close();
