import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import cardManifest from '../src/data/image-card-manifest.json' with { type: 'json' };
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/image-scheduling-browser/${scope}/`, import.meta.url);
const galleryUrl = new URL('?province=北京市&museum=gugong', base).href;
const checks = [];
await mkdir(output, { recursive: true });

const cardEntries = `performance.getEntriesByType('resource').filter(entry => { const path = new URL(entry.name).pathname; return path.includes('/artifact-responsive/') && path.includes('-card-w') && path.endsWith('.webp'); })`;

async function screenshot(page, name) {
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(name, output), Buffer.from(shot.data, 'base64'));
}

async function withPage(run, { weak = false } = {}) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    if (weak) {
      await page.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: 160 * 1024 / 8,
        uploadThroughput: 80 * 1024 / 8,
        connectionType: 'cellular3g',
      });
      await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  } finally {
    await page.close();
  }
}

await withPage(async page => {
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelector('h1')?.textContent.includes('故宫博物院') && document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'two initial card images');
  await page.wait(`(() => { const states=document.querySelectorAll('[data-artifact-image-state]').length; return states >= 4 && document.querySelectorAll('[data-artifact-image-state="deferred"]').length === states - 2; })()`, 'offscreen placeholders');
  await sleep(1000);
  const initial = await page.evaluate(`(() => {
    const root = document.querySelector('[data-artifact-scroll-root]');
    const cards = [...root.querySelectorAll('.grid > button')];
    const entries = ${cardEntries};
    return {
      requests: entries.length,
      bytes: entries.reduce((sum, entry) => sum + (entry.encodedBodySize || entry.transferSize || 0), 0),
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      frameHeights: cards.map(card => Math.round(card.querySelector(':scope > div').getBoundingClientRect().height)),
      loaded: document.querySelectorAll('[data-artifact-image-state="loaded"]').length,
      deferred: document.querySelectorAll('[data-artifact-image-state="deferred"]').length,
      totalStates: document.querySelectorAll('[data-artifact-image-state]').length,
    };
  })()`);
  assert.equal(initial.requests, 2);
  assert.equal(initial.loaded, 2);
  assert.equal(initial.deferred, initial.totalStates - 2);
  assert.ok(initial.frameHeights.every(height => height === initial.frameHeights[0]));
  checks.push(`mobile initial: exactly 2 visible requests / ${initial.bytes} B with 2 fixed-size placeholders`);

  const bottom = await page.evaluate(`(() => {
    const root = document.querySelector('[data-artifact-scroll-root]');
    root.scrollTop = root.scrollHeight;
    root.dispatchEvent(new Event('scroll'));
    return root.scrollTop;
  })()`);
  assert.ok(bottom > 500);
  await page.wait(`(() => { const image = document.querySelector('[data-artifact-scroll-root] .grid > button:last-child img'); return image?.complete && image.naturalWidth > 0; })()`, 'fast scroll loads last card', 30000);
  const afterFastScrollRequests = await page.evaluate(`${cardEntries}.length`);
  assert.ok(afterFastScrollRequests >= 3 && afterFastScrollRequests <= 4, afterFastScrollRequests);
  await screenshot(page, 'mobile-fast-scroll.png');
  checks.push(`mobile fast scroll: last card loads on range entry; skipped offscreen cards remain optional (${afterFastScrollRequests} total requests)`);

  await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop = 0`);
  await sleep(500);
  assert.equal(await page.evaluate(`${cardEntries}.length`), afterFastScrollRequests);
  checks.push('mobile reverse scroll: loaded cards stay mounted and do not issue duplicate requests');

  const restoredTop = await page.evaluate(`(() => {
    const root = document.querySelector('[data-artifact-scroll-root]');
    root.scrollTop = root.scrollHeight;
    const top = root.scrollTop;
    root.querySelector('.grid > button:last-child').click();
    return top;
  })()`);
  await page.wait(`!!document.querySelector('#artifact-dialog-title')`, 'detail opens from lower card');
  await page.wait(`document.querySelector('[role="dialog"] img')?.naturalWidth > 0`, 'detail image remains immediate');
  await page.evaluate(`history.back()`);
  await page.wait(`!new URLSearchParams(location.search).has('artifact')`, 'history back closes detail');
  const afterBack = await page.evaluate(`document.querySelector('[data-artifact-scroll-root]')?.scrollTop ?? -1`);
  assert.ok(Math.abs(afterBack - restoredTop) <= 2, `${afterBack}/${restoredTop}`);
  await page.evaluate(`history.forward()`);
  await page.wait(`!!new URLSearchParams(location.search).get('artifact') && !!document.querySelector('#artifact-dialog-title')`, 'history forward restores detail');
  await page.evaluate(`history.back()`);
  await page.wait(`!new URLSearchParams(location.search).has('artifact')`, 'second history back');
  assert.ok(Math.abs(await page.evaluate(`document.querySelector('[data-artifact-scroll-root]')?.scrollTop ?? -1`) - restoredTop) <= 2);
  checks.push('mobile history: detail back/forward preserves the lower gallery scroll position');
});

await withPage(async page => {
  await page.navigate(galleryUrl);
  await page.wait(`(() => { const images = [...document.querySelectorAll('[data-artifact-image-state="loaded"] img')]; return images.length === 2 && images.every(image => image.complete && image.naturalWidth > 0); })()`, 'weak initial visible images', 60000);
  assert.equal(await page.evaluate(`${cardEntries}.length`), 2);
  await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop = document.querySelector('[data-artifact-scroll-root]').scrollHeight`);
  await page.wait(`document.querySelector('.grid > button:last-child img')?.naturalWidth > 0`, 'weak fast-scroll lower image', 60000);
  assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  checks.push('mobile weak network: only 2 initial requests, then lower image recovers after fast scroll with no overflow');
}, { weak: true });

await withPage(async page => {
  const image = cardManifest['gg-ryzl'].image;
  await page.send('Network.setBlockedURLs', { urls: image.responsive.candidates.map(candidate => `*${candidate.src}`) });
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'failure case initial gate').catch(async error => {
    const state = await page.evaluate(`(() => ({title:document.querySelector('h1')?.textContent,states:[...document.querySelectorAll('[data-artifact-image-state]')].map(element=>element.getAttribute('data-artifact-image-state')),images:[...document.querySelectorAll('[data-artifact-image-state] img')].map(image=>({src:image.currentSrc,complete:image.complete,width:image.naturalWidth})),url:location.href}))()`);
    console.error('failure case initial gate state', JSON.stringify({state, failures: page.failures}));
    throw error;
  });
  await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop = document.querySelector('[data-artifact-scroll-root]').scrollHeight`);
  await page.evaluate(`document.querySelector('[data-artifact-card="gg-ryzl"]').scrollIntoView({block:'center'})`);
  await page.wait(`(() => { const card = document.querySelector('[data-artifact-card="gg-ryzl"]'); const loaded = card?.querySelector('img'); return loaded?.dataset.responsiveBypassed === 'true' && loaded.complete && loaded.naturalWidth > 0; })()`, 'deferred same-image fallback', 30000);
  assert.equal(await page.evaluate(`document.querySelector('[data-artifact-card="gg-ryzl"] img').currentSrc.endsWith(${JSON.stringify(image.src)})`), true);
  assert.equal(await page.evaluate(`document.querySelector('[data-artifact-card="gg-ryzl"]').textContent.includes('备用图')`), false);
  checks.push('mobile deferred failure: blocked WebP retries the same original only after its card enters range');
});

await withPage(async page => {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });` });
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === document.querySelectorAll('[data-artifact-image-state]').length`, 'observer compatibility fallback');
  assert.equal(await page.evaluate(`document.querySelectorAll('[data-artifact-image-state="deferred"]').length`), 0);
  checks.push('compatibility: missing IntersectionObserver loads all images instead of leaving blank cards');
});

const result = { baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks };
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
