// Production/local smoke matrix. Uses the repository's existing CDP driver.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from './cdp.mjs';

const base = process.env.BASE || 'http://127.0.0.1:4173/';
const out = process.argv[2] || '.qa/release/matrix';
mkdirSync(out, { recursive: true });
const report = { base, viewports: [], noJS: [], failures: [] };
const sizes = [[375,812],[375,667],[390,844],[768,1024],[1280,800],[1440,900],[1920,1080]];
const b = await launch({ port: 9458 });
const responses = [];
b.on('Network.responseReceived', p => { if (p.response.status >= 400) responses.push({url:p.response.url,status:p.response.status}); });
try {
  for (const [w,h] of sizes) {
    await b.viewport(w,h,{mobile:w<800,touch:w<800});
    for (const path of ['', 'rabbit/', 'hatter/', 'cheshire/']) {
      b.logs.length=0;
      b.requests.length=0;
      responses.length=0;
      await b.go(base+path,2500);
      const state = await b.eval(`(() => ({title:document.title,mode:document.documentElement.dataset.mode,
        overflow:document.documentElement.scrollWidth-innerWidth,
        heading:document.querySelector('h1')?.innerText,
        broken:[...document.images].filter(i=>i.offsetWidth&&i.complete&&!i.naturalWidth).map(i=>i.currentSrc),
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        firstPaint:performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint')?.startTime
      }))()`);
      const errors=b.logs.filter(l=>/\[error\]|\[exception\]/i.test(l));
      const videos=b.requests.filter(u=>u.endsWith('.mp4')).length;
      if(state.overflow>0||!state.heading||state.broken.length||errors.length||responses.length) report.failures.push({w,h,path,state,errors,responses:[...responses]});
      if(w<800&&videos) report.failures.push({w,h,path,videos});
      if(path) {
        await b.eval(`document.querySelector('.path-band .cta').click()`);
        await sleep(2100);
        assert.equal(await b.eval(`document.querySelector('.path').dataset.closer`),'1');
        assert.equal(await b.eval(`document.activeElement.closest('.path-closer') !== null`),true);
        await b.eval(`document.querySelector('.path-closer button').click()`);
        await sleep(2100);
        assert.equal(await b.eval(`document.querySelector('.path').dataset.closer`),'0');
      }
      await b.shot(join(out,`${w}x${h}-${path.replace('/','')||'home'}.jpg`));
      report.viewports.push({w,h,path,...state,videoRequests:videos,errors,httpErrors:[...responses]});
    }
  }
  await b.send('Emulation.setScriptExecutionDisabled',{value:true});
  for(const path of ['', 'rabbit/', 'hatter/', 'cheshire/']) {
    await b.go(base+path,500);
    report.noJS.push({path,...await b.eval(`({heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth,links:document.querySelectorAll('a[href]').length})`)});
  }
} finally {
  writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
  await b.close();
}
console.log(JSON.stringify({pages:report.viewports.length,noJS:report.noJS.length,failures:report.failures},null,2));
assert.equal(report.failures.length,0);
