import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';
import cards from '../src/data/image-card-manifest.json' with { type: 'json' };
import images from '../src/data/images.json' with { type: 'json' };

const base = 'http://127.0.0.1:4173/'; // Deliberately local-only: no deployment authorization.
const checks = [];
const count = `performance.getEntriesByType('resource').filter(e=>e.name.includes('/artifact-responsive/') && e.name.includes('-card-w'))`;
for (const weak of [false, true]) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    if (weak) {
      await page.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 100 * 1024, uploadThroughput: 30 * 1024, connectionType: 'cellular3g' });
      await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await page.navigate(base + '?province=北京市&museum=gugong');
    await page.wait(`(() => {const imgs=[...document.querySelectorAll('[data-artifact-image-state="loaded"] img')];return imgs.length===2 && imgs.every(i=>i.complete && i.naturalWidth>0);})()`, 'two initial photos', 60000);
    await sleep(1200);
    const first = await page.evaluate(`({requests:${count}.length, bytes:${count}.reduce((sum,e)=>sum+e.encodedBodySize,0)})`);
    assert.equal(first.requests, 2);
    checks.push({ name: weak ? 'weak-390-initial' : 'normal-390-initial', ...first });
    await page.navigate(base + '?province=北京市&museum=guobo');
    await page.wait(`!!document.querySelector('[data-artifact-scroll-root]')`, 'museum');
    await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop=1e6`);
    await page.wait(`!!document.querySelector('.grid > button:last-child img')?.naturalWidth`, 'new lower card', 60000);
    const top = await page.evaluate(`(() => {const root=document.querySelector('[data-artifact-scroll-root]');const top=root.scrollTop;root.querySelector('.grid > button:last-child').click();return top;})()`);
    await page.wait(`!!document.querySelector('[data-detail-image-state="ready"]') && new URLSearchParams(location.search).get('artifact')==='gb-cxct'`, 'boat photograph', 60000);
    await page.evaluate('history.back()');
    await page.wait(`!document.querySelector('[role="dialog"]')`, 'back');
    assert.ok(Math.abs(await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`) - top) <= 2);
    await page.evaluate('history.forward()');
    await page.wait(`!!document.querySelector('[data-detail-image-state="ready"]')`, 'forward');
    assert.equal(page.errors.length, 0);
    assert.equal(page.failures.length, 0);
    checks.push({ name: weak ? 'weak-390-new-card-history' : 'normal-390-new-card-history', passed: true });
  } finally { await page.close(); }
}

for (const blockOriginal of [false, true]) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    const src = images['gb-cxct'].src;
    const prefix = cards['gb-cxct'].image.responsive.candidates[0].src.split('-card-w')[0];
    await page.send('Network.setBlockedURLs', { urls: [`*${prefix}*`, ...(blockOriginal ? [`*${src}`] : [])] });
    await page.navigate(base + '?province=北京市&museum=guobo&artifact=gb-cxct');
    await page.wait(`!!document.querySelector('[data-detail-image-state="${blockOriginal ? 'fallback' : 'ready'}"]')`, 'blocked photo fallback');
    if (!blockOriginal) assert.equal(await page.evaluate(`document.querySelector('[data-detail-image-state] img').currentSrc.endsWith(${JSON.stringify(src)})`), true);
    else assert.equal(await page.evaluate(`!!document.querySelector('[data-detail-image-state] img')`), false);
    assert.equal(page.errors.length, 0);
    checks.push({ name: blockOriginal ? 'all-formats-fail-safe-illustration' : 'webp-fails-same-jpeg', passed: true });
  } finally { await page.close(); }
}
const result = { testedAt: new Date().toISOString(), base, checks };
await writeFile(new URL('../docs/audits/collection-image-review-browser/local/results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
