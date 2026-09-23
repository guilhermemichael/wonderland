// Visual pass over the journey: screenshots at named progress points.
// usage: node scripts/qa/journey.mjs <outDir> [width height] [points...]
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launch, sleep } from "./cdp.mjs";

const [, , out = ".qa", w = "1440", h = "900", ...pts] = process.argv;
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const POINTS = pts.length
  ? pts.map(Number)
  : [0, 0.03, 0.07, 0.12, 0.16, 0.2, 0.235, 0.26, 0.3, 0.36, 0.41, 0.45, 0.5, 0.56, 0.6, 0.66, 0.71, 0.76, 0.8, 0.86, 0.9, 0.94, 0.97, 1];

const b = await launch({ width: Number(w), height: Number(h) });
await b.viewport(Number(w), Number(h));
await b.go(BASE, 4000);
// wait for every video to be ready (or failed)
for (let i = 0; i < 80; i++) {
  const st = await b.eval(`JSON.stringify(document.querySelector('.experience').dataset)`);
  const d = JSON.parse(st);
  const done = [1, 2, 3, 4, 5].every((v) => d[`v${v}`] === "ready" || d[`v${v}`] === "failed");
  if (done) {
    console.log("videos:", [1, 2, 3, 4, 5].map((v) => `${v}:${d[`v${v}`]}`).join(" "));
    break;
  }
  await sleep(500);
}
await b.eval(`window.__go = (p) => { const t = document.querySelector('.track'); const r = t.offsetHeight - innerHeight; window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + p * r, behavior: 'instant' }); }`);
for (const p of POINTS) {
  await b.eval(`__go(${p})`);
  await sleep(1400);
  const info = await b.eval(`(() => { const e = document.querySelector('.experience'); const on = [...document.querySelectorAll('video.scrub.is-on')].map(v => v.dataset.video + '@' + v.currentTime.toFixed(2)); return e.dataset.chapter + ' ' + on.join(',') })()`);
  const name = `p${String(Math.round(p * 1000)).padStart(4, "0")}.jpg`;
  await b.shot(join(out, name));
  console.log(p, info, name);
}
const errs = b.logs.filter((l) => /error|exception/i.test(l));
console.log("console errors:", errs.length ? errs : "none");
await b.close();
