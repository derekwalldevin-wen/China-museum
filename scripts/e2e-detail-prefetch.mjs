import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import responsiveManifest from '../assets/responsive-images/manifest.json' with { type:'json' };
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/detail-prefetch-browser/${scope}/`, import.meta.url);
const galleryUrl = new URL('?province=北京市&museum=gugong', base).href;
const checks = [];
await mkdir(output, { recursive:true });

const cards = `[...document.querySelectorAll('[data-artifact-scroll-root] .grid > button')]`;
const cardByName = name => `${cards}.find(button => button.textContent.includes(${JSON.stringify(name)}))`;
const imageEntries = `performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('/artifact-responsive/'))`;

async function configure(page, mobile, weak = false) {
  await page.send('Network.setCacheDisabled', { cacheDisabled:true });
  await page.send('Emulation.setDeviceMetricsOverride', mobile
    ? { width:390, height:844, deviceScaleFactor:2, mobile:true }
    : { width:1440, height:960, deviceScaleFactor:1, mobile:false });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled:mobile, maxTouchPoints:mobile ? 5 : 1 });
  if (weak) {
    await page.send('Network.emulateNetworkConditions', {
      offline:false,
      latency:300,
      downloadThroughput:800 * 1024 / 8,
      uploadThroughput:300 * 1024 / 8,
      connectionType:'cellular3g',
    });
    await page.send('Emulation.setCPUThrottlingRate', { rate:4 });
  }
}

async function pointFor(page, expression) {
  return page.evaluate(`(() => { const rect=(${expression}).getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+Math.min(180,rect.height/2)}; })()`);
}

async function mouseClick(page, point) {
  await page.send('Input.dispatchMouseEvent', { type:'mousePressed', x:point.x, y:point.y, button:'left', clickCount:1 });
  await page.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:point.x, y:point.y, button:'left', clickCount:1 });
}

async function touch(page, point, finish = 'touchEnd') {
  await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:point.x, y:point.y, radiusX:2, radiusY:2, force:1, id:1 }] });
  await sleep(80);
  await page.send('Input.dispatchTouchEvent', { type:finish, touchPoints:[] });
}

async function withPage({ mobile = false, weak = false, allowBlocked = false } = {}, run) {
  const page = await createHeadlessPage();
  try {
    await configure(page, mobile, weak);
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
    if (!allowBlocked) assert.deepEqual(page.failures.filter(item => !/ERR_ABORTED/.test(item)), []);
  } finally {
    await page.close();
  }
}

console.log('check: mobile idle');
await withPage({ mobile:true }, async page => {
  await page.navigate(galleryUrl);
  // 首两张卡片加载缩略图，其余卡片保持 deferred（数量随馆藏件数变化，故按卡片数推导）
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2 && document.querySelectorAll('[data-artifact-image-state="deferred"]').length === ${cards}.length - 2 && ${cards}.length >= 2`, 'two-card guard');
  await sleep(700);
  assert.equal(await page.evaluate(`${imageEntries}.filter(entry => new URL(entry.name).pathname.includes('-card-w')).length`), 2);
  assert.equal(await page.evaluate(`${imageEntries}.filter(entry => new URL(entry.name).pathname.includes('-detail-')).length`), 0);
  await page.wait(`performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('/data/image-provenance/')).length === 1`, 'idle provenance warm', 45000);
  assert.equal(await page.evaluate(`performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('/data/image-provenance/')).length`), 1);
  checks.push('mobile idle: still exactly 2 card images and zero detail images, with one current-museum provenance payload');
});

console.log('check: desktop intent');
await withPage({}, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`${cards}.length >= 4`, 'desktop cards');
  const target = cardByName('《清明上河图》卷');
  const point = await pointFor(page, target);
  await page.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:point.x, y:point.y });
  await sleep(50);
  await page.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:2, y:2 });
  await sleep(180);
  assert.equal(await page.evaluate(`document.querySelectorAll('link[data-artifact-detail-preload]').length`), 0);
  await page.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:point.x, y:point.y });
  await page.wait(`!!document.querySelector('link[data-artifact-detail-preload*="/artifact-scroll-tiles/gg-qmsh/00-"]') && performance.getEntriesByType('resource').some(entry => new URL(entry.name).pathname.includes('/artifact-scroll-tiles/gg-qmsh/00-'))`, 'hover intent preload');
  const requestStart = await page.evaluate(`performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.includes('/artifact-scroll-tiles/gg-qmsh/00-')).startTime`);
  const clickTime = await page.evaluate(`performance.now()`);
  await mouseClick(page, point);
  await page.wait(`!!document.querySelector('[data-scroll-reader-ready="true"]')`, 'decoded first scroll tile ready');
  assert.ok(requestStart < clickTime, `${requestStart}/${clickTime}`);
  checks.push('desktop intent: 120ms hover dwell prevents sweep prefetch, then starts first audited scroll tile before click and opens decoded reader');
});

console.log('check: mobile cancel');
await withPage({ mobile:true }, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'mobile cards');
  await page.evaluate(`${cardByName('《千里江山图》卷')}.scrollIntoView({block:'center'})`);
  await page.wait(`[...document.querySelectorAll('[data-artifact-image-state="loaded"] img')].every(image => image.complete && image.naturalWidth > 0)`, 'settled cards before cancel');
  await sleep(250);
  await page.evaluate(`(() => {
    window.__cardRequestsAfterCancel = [];
    window.__cardRequestObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (new URL(entry.name).pathname.includes('-card-w')) window.__cardRequestsAfterCancel.push(entry.name);
    });
    window.__cardRequestObserver.observe({type:'resource', buffered:false});
  })()`);
  const point = await pointFor(page, cardByName('《千里江山图》卷'));
  await touch(page, point, 'touchCancel');
  await page.wait(`document.querySelectorAll('link[data-artifact-detail-preload]').length === 1`, 'touch intent preload');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).has('artifact')`), false);
  assert.equal(await page.evaluate(`!!document.querySelector('[role="dialog"]')`), false);
  await sleep(250);
  assert.deepEqual(await page.evaluate(`window.__cardRequestsAfterCancel`), []);
  checks.push('mobile cancel: touch intent may warm one detail, but touch cancel opens no dialog, writes no artifact URL and adds no further card request');
});

console.log('check: rapid navigation');
await withPage({}, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`${cards}.length >= 4`, 'rapid cards');
  await page.evaluate(`${cardByName('《清明上河图》卷')}.click()`);
  await page.wait(`!!document.querySelector('#artifact-dialog-title')`, 'first rapid detail');
  await page.evaluate(`document.querySelector('button[aria-label^="下一件："]').click()`);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('千里江山图') && !!document.querySelector('[data-scroll-reader-ready="true"]')`, 'second rapid detail');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('artifact')`), 'gg-qljs');
  checks.push('rapid navigation: a second artifact replaces the first without stale image or URL state');
});

console.log('check: weak mobile');
await withPage({ mobile:true, weak:true }, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'weak cards', 60000);
  const target = cardByName('《清明上河图》卷');
  const point = await pointFor(page, target);
  await touch(page, point);
  await page.wait(`!!document.querySelector('[role="dialog"]')`, 'weak dialog', 5000);
  const before = await page.evaluate(`(() => { const figure=document.querySelector('[aria-busy="true"]'); return {height:figure?.getBoundingClientRect().height, text:document.querySelector('[role="dialog"]')?.textContent}; })()`);
  assert.ok(before.height > 150 && /正在核读影像说明|正在展卷/.test(before.text));
  await page.wait(`!!document.querySelector('[data-scroll-reader-ready="true"]')`, 'weak reader ready', 60000);
  const afterHeight = await page.evaluate(`document.querySelector('[data-scroll-reader-ready="true"]').getBoundingClientRect().height`);
  assert.ok(Math.abs(afterHeight - before.height) <= 1, `${before.height}/${afterHeight}`);
  assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  checks.push('weak mobile: stable scroll frame appears immediately, then becomes decoded and interactive without layout or horizontal overflow');
});

console.log('check: history');
await withPage({ mobile:true }, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'history cards');
  // 与下方千里江山图同一套做法：把目标卡片滚入视口，再等它的缩略图加载
  // （直接跳到底部时中间的卡片始终在视口外，延迟图按设计不会加载）
  await page.evaluate(`${cardByName('各种釉彩大瓶')}.scrollIntoView({ block:'center' })`);
  await page.wait(`!!${cardByName('各种釉彩大瓶')}.querySelector('img')`, 'lower card');
  const rootTop = await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`);
  const point = await pointFor(page, cardByName('各种釉彩大瓶'));
  await touch(page, point);
  await page.wait(`!!document.querySelector('[data-detail-image-state="ready"]')`, 'history detail ready');
  await page.evaluate(`history.back()`);
  await page.wait(`!new URLSearchParams(location.search).has('artifact')`, 'history back');
  assert.ok(Math.abs(await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`) - rootTop) <= 2);
  await page.evaluate(`history.forward()`);
  await page.wait(`!!document.querySelector('[data-detail-image-state="ready"]')`, 'history forward ready');
  checks.push('history: back restores gallery position and forward restores the decoded detail');
});

console.log('check: failure recovery');
await withPage({ allowBlocked:true }, async page => {
  const delivery = responsiveManifest.artifacts['gg-gzdc'].roles.detail.primary;
  await page.send('Network.setBlockedURLs', { urls:delivery.candidates.map(candidate => `*${candidate.src}`) });
  await page.navigate(galleryUrl);
  await page.wait(`${cards}.length >= 4`, 'failure cards');
  const target = cardByName('各种釉彩大瓶');
  const point = await pointFor(page, target);
  await page.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:point.x, y:point.y });
  await sleep(180);
  await mouseClick(page, point);
  await page.wait(`(() => { const image=document.querySelector('[data-detail-image-state="ready"] img'); return image?.dataset.responsiveBypassed === 'true' && image.currentSrc.endsWith('/artifacts-v2/p1/gg-gzdc.png'); })()`, 'preload failure same-original recovery', 60000);
  assert.equal(await page.evaluate(`document.querySelector('[role="dialog"]').textContent.includes('AI 复原示意 · 非文物实拍')`), true);
  checks.push('failure: blocked prefetched WebP retries the same selected original and preserves AI disclosure');
});

const result = { baseUrl:base, testedAt:new Date().toISOString(), passed:checks.length, checks };
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
