import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const base = process.env.WEB_URL ?? "http://127.0.0.1:3000";

const viewports = [
  { label: "1440x900",  width: 1440, height: 900  },
  { label: "1024x768",  width: 1024, height: 768  },
  { label: "768x1024",  width: 768,  height: 1024 },
  { label: "390x844",   width: 390,  height: 844  },
];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const glErrors = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("GLTFLoader") || t.includes("Meshopt") || (t.includes("WebGL") && t.includes("Error"))) {
      glErrors.push(t);
    }
  });
  await page.goto(base + "/rabbit");
  await page.waitForLoadState("domcontentloaded");
  // Wait for arrival text (confirms page rendered), then wait for phase transition to 'watch' (+3s timer)
  await page.waitForTimeout(6000);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  assert.equal(overflow, false, `${vp.label}: horizontal overflow detected`);

  const hasCanvas = await page.locator("canvas").count() > 0;
  const hasFallback = await page.locator("[data-testid='watch-fallback'], .watch-fallback").count() > 0;
  assert.ok(hasCanvas || hasFallback, `${vp.label}: neither canvas nor fallback present`);
  assert.equal(glErrors.length, 0, `${vp.label}: GL/GLTF errors: ${glErrors.join("; ")}`);

  console.log(`${vp.label}: canvas=${hasCanvas} fallback=${hasFallback} overflow=${overflow} glErrors=${glErrors.length}`);
  await ctx.close();
}

await browser.close();
console.log("ALL VIEWPORT CHECKS PASS");
