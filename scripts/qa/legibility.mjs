// Worst-frame legibility capture: for each band plateau sample, hide the
// glyphs and capture the composited page, recording each text block's box.
// The contrast maths happen in legibility.py (PIL), on the saved frames.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { launch, sleep } from "./cdp.mjs";

const [, , out = ".qa/legibility"] = process.argv;
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";

const SAMPLES = {
  threshold: [0, 0.03, 0.06, 0.09, 0.11, 0.125],
  fall: [0.26, 0.28, 0.3, 0.315, 0.33, 0.34],
  disorientation: [0.46, 0.48, 0.5, 0.515, 0.53, 0.54],
  landing: [0.715, 0.73, 0.745, 0.76, 0.772, 0.776],
  crossroads: [0.95, 0.965, 0.98, 1],
};

const b = await launch({ width: 1440, height: 900, port: 9377 });
await b.viewport(1440, 900);
await b.go(BASE, 4000);
for (let i = 0; i < 80; i++) {
  const d = JSON.parse(await b.eval(`JSON.stringify(document.querySelector('.experience').dataset)`));
  if ([1, 2, 3, 4, 5].every((v) => d[`v${v}`] === "ready" || d[`v${v}`] === "failed")) break;
  await sleep(500);
}
await b.eval(
  `(() => { const s = document.createElement('style'); s.id = 'qa-hide';
    s.textContent = '.qa-hide-text .band-col, .qa-hide-text .band-col * { color: transparent !important; text-shadow: none !important; } .qa-hide-text .cta::after, .qa-hide-text .cta::before, .qa-hide-text .arrow, .qa-hide-text .band-counter, .qa-hide-text .hud, .qa-hide-text .nav, .qa-hide-text .hotspot-mark { visibility: hidden !important; }';
    document.head.appendChild(s);
    window.__go = (p) => { const t = document.querySelector('.track'); const r = t.offsetHeight - innerHeight; window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + p * r, behavior: 'instant' }); };
  })()`,
);

const index = [];
for (const [band, points] of Object.entries(SAMPLES)) {
  for (const p of points) {
    await b.eval(`__go(${p})`);
    await sleep(1300);
    const info = JSON.parse(
      await b.eval(`(() => {
        const band = document.querySelector('.band--${band}');
        const op = +getComputedStyle(band).opacity;
        const els = [...band.querySelectorAll('.band-col .kicker, .band-col .headline, .band-col .body, .band-col .cue, .band-col .cta .cta-label')];
        const boxes = els.map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return { k: el.className.split(' ')[0] || 'cta', x: r.x, y: r.y, w: r.width, h: r.height, color: cs.color, op: +cs.opacity }; });
        return JSON.stringify({ op, boxes });
      })()`),
    );
    if (info.op < 0.95) continue;
    const stem = `${band}-${String(Math.round(p * 1000)).padStart(4, "0")}`;
    // with the words, to find exactly which pixels a reader reads against
    const shown = await b.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${stem}-text.png`), Buffer.from(shown.data, "base64"));
    await b.eval(`document.documentElement.classList.add('qa-hide-text')`);
    await sleep(150);
    const shot = await b.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${stem}-bg.png`), Buffer.from(shot.data, "base64"));
    await b.eval(`document.documentElement.classList.remove('qa-hide-text')`);
    index.push({ band, p, file: `${stem}-bg.png`, text: `${stem}-text.png`, boxes: info.boxes.filter((x) => x.w > 4 && x.h > 4 && x.op > 0.6) });
  }
}
writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 1));
console.log("captured", index.length, "frames");
await b.close();
