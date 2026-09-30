import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/provenance-idle-warm-browser/${scope}/`, import.meta.url);
const galleryUrl = new URL('?province=北京市&museum=gugong', base).href;
const checks = [];
await mkdir(output, { recursive:true });

const provenanceEntries = `performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('/data/image-provenance/'))`;
const detailEntries = `performance.getEntriesByType('resource').filter(entry => { const path=new URL(entry.name).pathname; return path.includes('-detail-') || path.includes('-scroll-detail-'); })`;
const cardEntries = `performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('-card-w'))`;
const cards = `[...document.querySelectorAll('[data-artifact-card]')]`;

async function configure(page, initScript = '') {
  await page.send('Network.setCacheDisabled', { cacheDisabled:true });
  await page.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
  if (initScript) await page.send('Page.addScriptToEvaluateOnNewDocument', { source:initScript });
}

async function withPage(initScript, run, { allowBlocked = false } = {}) {
  const page = await createHeadlessPage();
  try {
    await configure(page, initScript);
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
    if (!allowBlocked) assert.deepEqual(page.failures.filter(item => !/ERR_ABORTED/.test(item)), []);
  } finally { await page.close(); }
}

async function waitFirstTwo(page) {
  await page.wait(`(() => { const first=${cards}.slice(0,2); return first.length===2 && first.every(card => { const image=card.querySelector('img'); return !card.querySelector('[data-artifact-image-state="deferred"]') && (!image || (image.complete && image.naturalWidth>0)); }); })()`, 'first two cards settled', 60000);
}

async function intentFirstCard(page) {
  const point = await page.evaluate(`(() => { const rect=${cards}[0].getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+160}; })()`);
  await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:point.x, y:point.y, radiusX:2, radiusY:2, force:1, id:1 }] });
  await sleep(80);
  await page.send('Input.dispatchTouchEvent', { type:'touchCancel', touchPoints:[] });
}

console.log('check: ordinary idle metadata only');
await withPage('', async page => {
  await page.navigate(galleryUrl);
  await waitFirstTwo(page);
  await page.wait(`${provenanceEntries}.length === 1 && ${provenanceEntries}[0].responseEnd > 0`, 'idle provenance ready');
  assert.equal(await page.evaluate(`${cardEntries}.length`), 2);
  assert.equal(await page.evaluate(`${detailEntries}.length`), 0);
  assert.equal(await page.evaluate(`document.querySelectorAll('link[data-artifact-detail-preload]').length`), 0);
  checks.push('ordinary network: after two decoded cards, one museum provenance payload warms at idle; card requests stay 2 and detail requests stay 0');
});

for (const scenario of [
  { name:'Save-Data', source:`Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'4g'}});` },
  { name:'2G', source:`Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:false,effectiveType:'2g'}});` },
  { name:'low battery', source:`Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:false,effectiveType:'4g'}}); Object.defineProperty(navigator,'getBattery',{configurable:true,value:()=>Promise.resolve({level:0.1,charging:false})});` },
]) {
  console.log(`check: ${scenario.name} intent only`);
  await withPage(scenario.source, async page => {
    await page.navigate(galleryUrl);
    await waitFirstTwo(page);
    await sleep(1900);
    assert.equal(await page.evaluate(`${provenanceEntries}.length`), 0);
    assert.equal(await page.evaluate(`${detailEntries}.length`), 0);
    await intentFirstCard(page);
    await page.wait(`${provenanceEntries}.length === 1`, `${scenario.name} intent provenance`);
    await page.wait(`${detailEntries}.length === 1`, `${scenario.name} intent detail`);
    assert.equal(await page.evaluate(`new URLSearchParams(location.search).has('artifact')`), false);
    checks.push(`${scenario.name}: idle stays network-silent; touch intent loads one provenance and one audited detail without opening after cancel`);
  });
}

console.log('check: switch cancels scheduled museum');
await withPage(`window.requestIdleCallback=callback=>window.setTimeout(()=>callback({didTimeout:false,timeRemaining:()=>20}),1800); window.cancelIdleCallback=id=>clearTimeout(id);`, async page => {
  await page.navigate(galleryUrl);
  await waitFirstTwo(page);
  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('下一馆'))?.click()`);
  await page.wait(`document.querySelector('h1')?.textContent && !document.querySelector('h1').textContent.includes('故宫博物院')`, 'next museum');
  await sleep(2200);
  const paths = await page.evaluate(`${provenanceEntries}.map(entry => new URL(entry.name).pathname)`);
  assert.equal(paths.some(path => path.endsWith('/gugong.json')), false);
  assert.ok(paths.length <= 1, JSON.stringify(paths));
  checks.push('switch museum: pending idle work for the old museum is cancelled; at most the new museum payload is fetched');
});

console.log('check: failed idle request retries on intent');
await withPage('', async page => {
  await page.send('Network.setBlockedURLs', { urls:['*/data/image-provenance/gugong.json'] });
  await page.navigate(galleryUrl);
  await waitFirstTwo(page);
  await page.wait(`performance.getEntriesByName('huaxia:provenance:gugong:failed').length === 1`, 'idle failure');
  await page.send('Network.setBlockedURLs', { urls:[] });
  await intentFirstCard(page);
  await page.wait(`${provenanceEntries}.some(entry => entry.responseEnd > 0)`, 'intent metadata retry');
  await page.wait(`${detailEntries}.length === 1`, 'intent image after metadata retry');
  checks.push('failure retry: rejected idle cache entry is removed and touch intent successfully retries metadata then detail');
}, { allowBlocked:true });

console.log('check: history and cache boundary');
await withPage('', async page => {
  await page.navigate(galleryUrl);
  await waitFirstTwo(page);
  await page.wait(`${provenanceEntries}.length === 1 && ${provenanceEntries}[0].responseEnd > 0`, 'cache warm');
  const rootTop = await page.evaluate(`(() => { const root=document.querySelector('[data-artifact-scroll-root]'); root.scrollTop=260; return root.scrollTop; })()`);
  await page.evaluate(`${cards}[0].click()`);
  await page.wait(`!!document.querySelector('[role="dialog"]')`, 'detail open');
  await page.evaluate(`history.back()`);
  await page.wait(`!document.querySelector('[role="dialog"]')`, 'history back');
  assert.ok(Math.abs(await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`) - rootTop) <= 2);
  await page.evaluate(`${cards}[1].click()`);
  await page.wait(`!!document.querySelector('[role="dialog"]')`, 'second detail');
  assert.equal(await page.evaluate(`${provenanceEntries}.length`), 1);
  checks.push('history/cache: back restores gallery scroll and multiple artifacts in one museum reuse exactly one provenance request');
});

const result = { baseUrl:base, testedAt:new Date().toISOString(), passed:checks.length, checks };
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
