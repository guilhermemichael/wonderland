// Adversarial self-test (references/scrub-pipeline.md, "The self-testing checklist").
// usage: node scripts/qa/suite.mjs <outDir> <scenario...>
// scenarios: flick, legibility, mobile, reduced, reducedLive, blocked, overflow, keyboard, paths, hover, jumps, rest
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launch, sleep } from "./cdp.mjs";

const [, , out = ".qa", ...wanted] = process.argv;
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const report = {};
const want = (s) => wanted.length === 0 || wanted.includes(s);

const GO = `window.__go = (p) => { const t = document.querySelector('.track'); const r = t.offsetHeight - innerHeight; window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + p * r, behavior: 'instant' }); }`;

async function desktop(w = 1440, h = 900, opts = {}) {
  const b = await launch({ width: w, height: h, port: 9333 + Math.floor(Math.random() * 400) });
  await b.viewport(w, h);
  if (opts.block) await b.block(opts.block);
  if (opts.media) await b.media(opts.media);
  if (opts.collect) {
    // a collector in place before the first event, like a real integration
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: "window.dataLayer = window.dataLayer || [];" });
  }
  await b.go(opts.url ?? BASE, opts.wait ?? 3500);
  await b.eval(GO);
  return b;
}

async function waitVideos(b) {
  for (let i = 0; i < 80; i++) {
    const d = JSON.parse(await b.eval(`JSON.stringify(document.querySelector('.experience')?.dataset ?? {})`));
    if ([1, 2, 3, 4, 5].every((v) => d[`v${v}`] === "ready" || d[`v${v}`] === "failed")) return d;
    await sleep(500);
  }
}

/* 1. flick test: wheel steps of 120, 240, 360px; every band readable for 5+
      normal flicks, none skippable at 360px */
if (want("flick")) {
  const b = await desktop();
  await waitVideos(b);
  const res = {};
  for (const [step, count] of [
    [120, 290],
    [240, 150],
    [360, 100],
  ]) {
    await b.eval(`window.scrollTo(0,0)`);
    await sleep(800);
    const seen = {};
    const full = {};
    let run = {};
    for (let i = 0; i < count; i++) {
      await b.wheel(step);
      await sleep(step === 120 ? 160 : 220);
      const ops = JSON.parse(
        await b.eval(
          `JSON.stringify([...document.querySelectorAll('.band')].map(e => [e.dataset.band, +getComputedStyle(e).opacity]))`,
        ),
      );
      for (const [id, o] of ops) {
        seen[id] = Math.max(seen[id] ?? 0, o);
        if (o > 0.97) {
          run[id] = (run[id] ?? 0) + 1;
          full[id] = Math.max(full[id] ?? 0, run[id]);
        } else run[id] = 0;
      }
      const atEnd = await b.eval(`scrollY + innerHeight >= document.querySelector('.track').offsetHeight - 2`);
      if (atEnd) break;
    }
    res[step] = { maxOpacity: seen, longestFullRun: full };
  }
  report.flick = res;
  await b.close();
}

/* 2. worst-frame legibility: hide the glyphs, capture the composited page,
      find the lightest pixel under each text block, contrast vs the text */
if (want("legibility")) {
  const b = await desktop();
  await waitVideos(b);
  const L = JSON.parse(
    await b.eval(`(() => {
      const bands = [...document.querySelectorAll('.band')];
      return JSON.stringify(bands.map(e => e.dataset.band));
    })()`),
  );
  // sample each band's plateau at several points (worst frame, not average)
  const samples = {
    threshold: [0, 0.03, 0.06, 0.09, 0.105, 0.115],
    fall: [0.255, 0.27, 0.285, 0.3, 0.315, 0.33],
    disorientation: [0.465, 0.48, 0.495, 0.51, 0.525, 0.535],
    landing: [0.715, 0.73, 0.745, 0.76, 0.77, 0.775],
    crossroads: [0.965, 0.975, 0.985, 1],
  };
  const res = {};
  for (const id of L) {
    let worst = { ratio: 99 };
    for (const p of samples[id]) {
      await b.eval(`__go(${p})`);
      await sleep(1300);
      const boxes = JSON.parse(
        await b.eval(`(() => {
          const band = document.querySelector('.band--${id}');
          if (+getComputedStyle(band).opacity < 0.97) return JSON.stringify([]);
          const els = [...band.querySelectorAll('.band-col .kicker, .band-col .headline, .band-col .body, .band-col .cue, .band-col .cta')];
          const rects = els.map(el => { const r = el.getBoundingClientRect(); return { k: el.className.split(' ')[0], x: r.x, y: r.y, w: r.width, h: r.height }; });
          document.documentElement.classList.add('qa-hide-text');
          return JSON.stringify(rects);
        })()`),
      );
      if (!boxes.length) continue;
      await b.eval(`(() => { let s = document.getElementById('qa-hide'); if (!s) { s = document.createElement('style'); s.id='qa-hide'; s.textContent = '.qa-hide-text .band-col *, .qa-hide-text .band-col { color: transparent !important; text-shadow: none !important; } .qa-hide-text .cta::after, .qa-hide-text .cta::before, .qa-hide-text .arrow { visibility: hidden !important }'; document.head.appendChild(s); } })()`);
      await sleep(120);
      const shot = await b.send("Page.captureScreenshot", { format: "png" });
      await b.eval(`document.documentElement.classList.remove('qa-hide-text')`);
      const r = await analyse(Buffer.from(shot.data, "base64"), boxes);
      for (const x of r) if (x.ratio < worst.ratio) worst = { ...x, p };
    }
    res[id] = worst;
  }
  report.legibility = res;
  await b.close();
}

async function analyse(png, boxes) {
  // decode PNG through the browser-free path: use a tiny helper page? No:
  // parse with zlib (PNG is RGBA/RGB, 8-bit, no interlace from Chrome).
  const zlib = await import("node:zlib");
  let pos = 8;
  let w = 0;
  let h = 0;
  let ct = 0;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3;
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
    cur.copy(px, y * stride);
    prev = cur;
  }
  const lum = (r, g, b) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const text = lum(233, 226, 212);
  const secondary = lum(181, 178, 170);
  return boxes.map((bx) => {
    let worst = 0;
    const x0 = Math.max(0, Math.floor(bx.x));
    const y0 = Math.max(0, Math.floor(bx.y));
    const x1 = Math.min(w, Math.ceil(bx.x + bx.w));
    const y1 = Math.min(h, Math.ceil(bx.y + bx.h));
    // 99.5th percentile of luminance: the worst realistic pixel, not a stray spark
    const vals = [];
    for (let y = y0; y < y1; y += 2)
      for (let x = x0; x < x1; x += 2) {
        const i = y * stride + x * bpp;
        vals.push(lum(px[i], px[i + 1], px[i + 2]));
      }
    vals.sort((a, b) => a - b);
    worst = vals[Math.floor(vals.length * 0.995)] ?? 0;
    const t = bx.k === "kicker" || bx.k === "cue" ? secondary : text;
    const ratio = (Math.max(t, worst) + 0.05) / (Math.min(t, worst) + 0.05);
    return { el: bx.k, ratio: +ratio.toFixed(2) };
  });
}

/* 3. phones and portrait tablets: static-first, zero video requests */
if (want("mobile")) {
  const res = {};
  for (const [name, w, h, touch] of [
    ["375x812", 375, 812, true],
    ["375x667", 375, 667, true],
    ["390x844", 390, 844, true],
    ["768x1024", 768, 1024, true],
    ["844x390-land", 844, 390, true],
  ]) {
    const b = await launch({ width: w, height: h, port: 9800 + Math.floor(Math.random() * 100) });
    await b.viewport(w, h, { mobile: true, dpr: 2, touch });
    await b.go(BASE, 3500);
    const mode = await b.eval(`document.documentElement.dataset.mode`);
    const vids = b.requests.filter((u) => u.includes(".mp4"));
    const overflow = await b.eval(`document.documentElement.scrollWidth - innerWidth`);
    await b.shot(join(out, `mobile-${name}-0.jpg`));
    for (const [i, id] of ["fall", "landing", "paths"].entries()) {
      await b.eval(`document.getElementById('${id}').scrollIntoView()`);
      await sleep(1600);
      await b.shot(join(out, `mobile-${name}-${i + 1}.jpg`));
    }
    res[name] = { mode, videoRequests: vids.length, overflowX: overflow, errors: b.logs.filter((l) => /error|exception/i.test(l)) };
    await b.close();
  }
  report.mobile = res;
}

/* 4. reduced motion before load: final states, no video */
if (want("reduced")) {
  const b = await desktop(1440, 900, { media: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(1000);
  const mode = await b.eval(`document.documentElement.dataset.mode`);
  const k = await b.eval(`[...document.querySelectorAll('.band')].map(e => getComputedStyle(e).getPropertyValue('--k')).join(',')`);
  await b.shot(join(out, "reduced-0.jpg"));
  await b.eval(`document.getElementById('landing').scrollIntoView()`);
  await sleep(800);
  await b.shot(join(out, "reduced-1.jpg"));
  report.reduced = { mode, k, videoRequests: b.requests.filter((u) => u.includes(".mp4")).length };
  await b.close();
}

/* 5. reduced motion flipped live, both directions */
if (want("reducedLive")) {
  const b = await desktop();
  await waitVideos(b);
  await b.eval(`__go(0.3)`);
  await sleep(1500);
  await b.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await sleep(1200);
  const on = {
    mode: await b.eval(`document.documentElement.dataset.mode`),
    inertBands: await b.eval(`[...document.querySelectorAll('.band')].filter(e => e.inert).length`),
    hiddenBands: await b.eval(`[...document.querySelectorAll('.band')].filter(e => getComputedStyle(e).visibility === 'hidden').length`),
  };
  await b.shot(join(out, "reducedLive-on.jpg"));
  await b.media([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await sleep(1500);
  await b.eval(`__go(0.5)`);
  await sleep(1500);
  const off = {
    mode: await b.eval(`document.documentElement.dataset.mode`),
    chapter: await b.eval(`document.querySelector('.experience').dataset.chapter`),
    videoOn: await b.eval(`[...document.querySelectorAll('video.scrub.is-on')].map(v=>v.dataset.video+'@'+v.currentTime.toFixed(2)).join()`),
  };
  await b.shot(join(out, "reducedLive-off.jpg"));
  report.reducedLive = { on, off };
  await b.close();
}

/* 6. every video blocked: the journey must stay complete over stills */
if (want("blocked")) {
  const b = await desktop(1440, 900, { block: ["*.mp4"] });
  await sleep(2500);
  const st = JSON.parse(await b.eval(`JSON.stringify(document.querySelector('.experience').dataset)`));
  for (const p of [0.05, 0.2, 0.3, 0.42, 0.6, 0.76, 0.9, 1]) {
    await b.eval(`__go(${p})`);
    await sleep(1100);
    await b.shot(join(out, `blocked-${String(Math.round(p * 100)).padStart(3, "0")}.jpg`));
  }
  report.blocked = { state: st, errors: b.logs.filter((l) => /exception/i.test(l)) };
  await b.close();
}

/* 7. try to force the page sideways */
if (want("overflow")) {
  const res = {};
  for (const [w, h] of [
    [1440, 900],
    [1280, 800],
    [1920, 1080],
    [2560, 1080],
    [1280, 520],
    [1024, 768],
  ]) {
    const b = await desktop(w, h, { wait: 2500 });
    const r = [];
    for (const p of [0, 0.3, 0.6, 1]) {
      await b.eval(`__go(${p})`);
      await sleep(500);
      r.push(await b.eval(`document.documentElement.scrollWidth - innerWidth`));
    }
    await b.eval(`window.scrollTo({left: 400, top: scrollY})`);
    r.push(await b.eval(`scrollX`));
    await b.shot(join(out, `vp-${w}x${h}.jpg`));
    res[`${w}x${h}`] = r;
    await b.close();
  }
  report.overflow = res;
}

/* 8. keyboard only: skip link, focus order, chapter jumps on focus */
if (want("keyboard")) {
  const b = await desktop();
  await waitVideos(b);
  const seq = [];
  for (let i = 0; i < 16; i++) {
    await b.key("Tab", "Tab", 9);
    await sleep(600);
    seq.push(
      await b.eval(`(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 30)) + ' | chapter=' + document.querySelector('.experience').dataset.chapter + ' | visible=' + (r.width > 0 && getComputedStyle(a).visibility !== 'hidden'); })()`),
    );
    if (i === 3 || i === 12) await b.shot(join(out, `keyboard-${i}.jpg`));
  }
  report.keyboard = seq;
  await b.close();
}

/* 9. the three paths */
if (want("paths")) {
  const res = {};
  for (const id of ["rabbit", "hatter", "cheshire"]) {
    const b = await desktop(1440, 900, { url: `${BASE}${id}/`, wait: 4200 });
    await b.shot(join(out, `path-${id}.jpg`));
    await b.eval(`document.querySelector('.path-band .cta').click()`);
    await sleep(2600);
    await b.shot(join(out, `path-${id}-closer.jpg`));
    res[id] = { errors: b.logs.filter((l) => /error|exception/i.test(l)), overflow: await b.eval(`document.documentElement.scrollWidth - innerWidth`) };
    await b.close();
    const m = await launch({ width: 390, height: 844, port: 9900 + Math.floor(Math.random() * 60) });
    await m.viewport(390, 844, { mobile: true, dpr: 2, touch: true });
    await m.go(`${BASE}${id}/`, 3500);
    await m.shot(join(out, `path-${id}-mobile.jpg`));
    res[id].mobileOverflow = await m.eval(`document.documentElement.scrollWidth - innerWidth`);
    await m.close();
  }
  report.paths = res;
}

/* 10. crossroads hover reactions */
if (want("hover")) {
  const b = await desktop();
  await waitVideos(b);
  await b.eval(`__go(1)`);
  await sleep(1800);
  for (const [id, x, y] of [
    ["rabbit", 190, 560],
    ["hatter", 690, 300],
    ["cheshire", 1300, 460],
  ]) {
    await b.mouse("mouseMoved", x, y);
    await sleep(1500);
    await b.shot(join(out, `hover-${id}.jpg`));
  }
  report.hover = { cursor: await b.eval(`document.querySelector('.cursor').dataset.on + ':' + document.querySelector('.cursor-label').textContent`) };
  await b.close();
}

/* 11. navigation jumps, reload mid-journey, CTA descent */
if (want("jumps")) {
  const b = await desktop(1440, 900, { collect: true });
  await waitVideos(b);
  await b.eval(`document.querySelector('.nav-links a[href="/#paths"]').click()`);
  await sleep(1600);
  const afterPaths = await b.eval(`document.querySelector('.experience').dataset.chapter`);
  await b.shot(join(out, "jump-paths.jpg"));
  await b.eval(`__go(0.5)`);
  await sleep(600);
  await b.send("Page.reload");
  await sleep(4500);
  const afterReload = await b.eval(`document.querySelector('.experience').dataset.chapter + ' p=' + (scrollY / (document.querySelector('.track').offsetHeight - innerHeight)).toFixed(3)`);
  await b.shot(join(out, "jump-reload.jpg"));
  await b.eval(`window.scrollTo(0,0)`);
  await sleep(1200);
  await b.eval(`document.querySelector('[data-cta="threshold"]').click()`);
  await sleep(7500);
  const afterEnter = await b.eval(`document.querySelector('.experience').dataset.chapter`);
  await b.shot(join(out, "jump-enter.jpg"));
  const events = await b.eval(`(window.dataLayer||[]).map(e => e.event + (e.percent ? ':' + e.percent : '') + (e.path ? ':' + e.path : '')).join(', ')`);
  report.jumps = { afterPaths, afterReload, afterEnter, events };
  await b.close();
}

/* 12. loops rest: no rAF while idle, nothing animating on hidden tabs */
if (want("rest")) {
  const b = await desktop();
  await waitVideos(b);
  // the scrub loop writes styles on every tick; zero writes while idle = it rests
  await b.eval(`__go(0.3)`);
  await sleep(2500);
  await b.eval(`(() => { window.__mut = 0; const mo = new MutationObserver((l) => { window.__mut += l.length; }); mo.observe(document.querySelector('.experience'), { attributes: true, subtree: true, attributeFilter: ['style', 'class'] }); window.__mo = mo; })()`);
  await sleep(2500);
  const idle = await b.eval(`window.__mut`);
  await b.eval(`__go(0.35)`);
  await sleep(300);
  const moving = await b.eval(`window.__mut`);
  report.rest = { styleWritesIn2500msIdle: idle, writesAfterAScroll: moving };
  await b.close();
}

console.log(JSON.stringify(report, null, 1));
