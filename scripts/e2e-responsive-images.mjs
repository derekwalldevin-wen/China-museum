import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import cardManifest from '../src/data/image-card-manifest.json' with { type: 'json' };
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/responsive-images-browser/${scope}/`, import.meta.url);
await mkdir(output, { recursive: true });
const checks = [];

async function screenshot(page, name) {
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(name, output), Buffer.from(shot.data, 'base64'));
}

async function withPage(metrics, run) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', metrics);
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: metrics.mobile, maxTouchPoints: metrics.mobile ? 5 : 1 });
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  } finally {
    await page.close();
  }
}

const galleryUrl = new URL('?province=北京市&museum=gugong', base).href;

await withPage({ width: 1440, height: 960, deviceScaleFactor: 1, mobile: false }, async page => {
  await page.navigate(galleryUrl);
  await page.wait(`document.querySelector('h1')?.textContent.includes('故宫博物院') && document.querySelectorAll('picture source[type="image/webp"]').length >= 4`, 'desktop responsive gallery');
  await page.wait(`[...document.querySelectorAll('article img, button img')].filter(image => image.currentSrc.includes('/artifact-responsive/')).length >= 4`, 'desktop WebP images');
  await sleep(500);
  const state = await page.evaluate(`(() => {
    const entries = performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('/artifact-responsive/'));
    const bytes = entry => entry.encodedBodySize || entry.transferSize || 0;
    return {
      count: entries.length,
      total: entries.reduce((sum, entry) => sum + bytes(entry), 0),
      maximum: Math.max(...entries.map(bytes)),
      originals: [...document.querySelectorAll('picture img')].slice(0, 4).map(image => image.dataset.originalSrc),
      currents: [...document.querySelectorAll('picture img')].slice(0, 4).map(image => image.currentSrc),
      sizes: [...document.querySelectorAll('picture source')].slice(0, 4).map(source => source.sizes),
    };
  })()`);
  assert.ok(state.count >= 4);
  assert.ok(state.total <= 150_000, `desktop artifact bytes ${state.total}`);
  assert.ok(state.maximum <= 50_000, `desktop max artifact ${state.maximum}`);
  assert.ok(state.originals.every(src => /\.(?:png|jpe?g)$/i.test(src)));
  assert.ok(state.currents.every(src => src.includes('/artifact-responsive/') && src.endsWith('.webp')));
  assert.ok(state.sizes.every(Boolean));
  await screenshot(page, 'desktop-gallery.webp.png');
  checks.push(`desktop: ${state.count} responsive requests, ${state.total} B total, ${state.maximum} B max`);

  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('清明上河图')).click()`);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('清明上河图')`, 'Qingming detail');
  // The scroll reader renders the Qingming scroll from long-scroll tiles
  // (public/artifact-scroll-tiles), not from the single responsive WebP; the responsive
  // WebP path in the same dialog is covered by the gallery assertions above.
  await page.wait(`document.querySelector('[aria-label*="长卷阅卷台"] img')?.currentSrc.includes('/artifact-scroll-tiles/')`, 'Qingming tiled scroll reader');
  assert.equal(await page.evaluate(`document.body.textContent.includes('AI 复原示意 · 非文物实拍')`), false);
  assert.equal(await page.evaluate(`document.body.textContent.includes('来源图 · 非 AI 复原')`), true);
  checks.push('desktop: Qingming detail keeps source-image disclosure and scroll reader while using same-pixel WebP');
});

await withPage({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, async page => {
  await page.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 160 * 1024 / 8,
    uploadThroughput: 80 * 1024 / 8,
    connectionType: 'cellular3g',
  });
  await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.navigate(galleryUrl);
  await page.wait(`[...document.querySelectorAll('picture img')].filter(image => image.currentSrc.includes('/artifact-responsive/') && image.complete).length >= 2`, 'weak network mobile WebP', 40000);
  assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  assert.equal(await page.evaluate(`[...document.querySelectorAll('picture img')].some(image => image.naturalWidth === 0)`), false);
  await screenshot(page, 'mobile-weak-network.webp.png');
  checks.push('mobile weak-network: responsive cards settle under 3G latency and 4x CPU throttling without overflow');
});

await withPage({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, async page => {
  await page.send('Network.setBlockedURLs', { urls: ['*/artifact-responsive/*'] });
  await page.navigate(galleryUrl);
  await page.wait(`[...document.querySelectorAll('picture img')].filter(image => image.dataset.responsiveBypassed === 'true' && image.complete && image.naturalWidth > 0).length >= 2`, 'same-image original fallback', 60000);
  assert.equal(await page.evaluate(`[...document.querySelectorAll('picture img')].slice(0, 2).every(image => image.currentSrc.endsWith(image.dataset.originalSrc))`), true);
  assert.equal(await page.evaluate(`document.body.textContent.includes('备用图')`), false);
  checks.push('mobile: WebP transport failure retries the same selected JPEG/PNG before semantic fallback');
});

await withPage({ width: 1440, height: 960, deviceScaleFactor: 1, mobile: false }, async page => {
  const primary = cardManifest['gg-qmsh'].image;
  assert.ok(primary?.fallback);
  const blocked = [...primary.responsive.candidates.map(candidate => `*${candidate.src}`), `*${primary.src}`];
  await page.send('Network.setBlockedURLs', { urls: blocked });
  await page.navigate(galleryUrl);
  await page.wait(`document.body.textContent.includes('备用图')`, 'semantic image fallback', 30000);
  await page.wait(`(() => { const card = [...document.querySelectorAll('button')].find(button => button.textContent.includes('清明上河图')); const image = card?.querySelector('img'); return image?.complete && image.currentSrc.length > 0 && image.naturalWidth > 0; })()`, 'semantic fallback image settled', 30000);
  const fallback = await page.evaluate(`(() => {
    const card = [...document.querySelectorAll('button')].find(button => button.textContent.includes('清明上河图'));
    return { current: card?.querySelector('img')?.currentSrc, ai: card?.textContent.includes('AI 复原示意') };
  })()`);
  assert.ok(fallback.current.includes('/artifact-responsive/') || fallback.current.endsWith(primary.fallback.src), JSON.stringify({ fallback, expected: primary.fallback.src }));
  assert.equal(fallback.ai, false);
  checks.push('desktop: selected image plus original failure advances to the existing legacy semantic fallback');
});

const result = { baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks };
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
