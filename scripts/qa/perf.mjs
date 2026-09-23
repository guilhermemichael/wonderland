// Speed receipts: measured, never estimated (references/deploy.md).
import { launch, sleep } from "./cdp.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const b = await launch({ width: 1440, height: 900, port: 9455 });
await b.viewport(1440, 900);
await b.go(BASE, 1200);
const first = await b.eval(`(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const sum = (f) => res.filter(f).reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0);
  const paint = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint');
  return JSON.stringify({
    load_ms: Math.round(nav.loadEventEnd),
    dom_ready_ms: Math.round(nav.domContentLoadedEventEnd),
    first_contentful_paint_ms: paint ? Math.round(paint.startTime) : null,
    html_kb: Math.round((nav.transferSize || nav.encodedBodySize) / 1024),
    js_kb: Math.round(sum(r => r.name.endsWith('.js')) / 1024),
    css_kb: Math.round(sum(r => r.name.endsWith('.css')) / 1024),
    fonts_kb: Math.round(sum(r => r.name.includes('.woff')) / 1024),
    images_kb: Math.round(sum(r => /\\.(avif|webp|jpg|png|svg)/.test(r.name)) / 1024),
    video_kb: Math.round(sum(r => r.name.includes('.mp4')) / 1024),
    requests: res.length,
  });
})()`);
console.log("at first paint (before any video):", first);

// then let the journey load everything it needs
await sleep(45000);
const full = await b.eval(`(() => {
  const res = performance.getEntriesByType('resource');
  const sum = (f) => res.filter(f).reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0);
  const v = res.filter(r => r.name.includes('.mp4'));
  return JSON.stringify({
    video_files: v.length,
    video_mb: +(sum(r => r.name.includes('.mp4')) / 1048576).toFixed(2),
    video_times_s: v.map(r => +(r.duration / 1000).toFixed(1)),
    images_kb: Math.round(sum(r => /\\.(avif|webp|jpg|png|svg)/.test(r.name)) / 1024),
    total_mb: +(sum(() => true) / 1048576).toFixed(2),
  });
})()`);
console.log("after the whole journey has loaded:", full);
await b.close();
