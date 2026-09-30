import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import tiles from '../src/data/qingming-tiles.json' with { type:'json' };
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const url = new URL('?province=北京市&museum=gugong&artifact=gg-qmsh', base).href;
const output = new URL('../docs/audits/qingming-tiles-local/', import.meta.url);
await mkdir(output, { recursive:true });
const results = [];

for (const mobile of [false, true]) {
  const page = await createHeadlessPage();
  try {
    console.log(mobile ? 'mobile: configure' : 'desktop: configure');
    await page.send('Network.setCacheDisabled', { cacheDisabled:true });
    await page.send('Emulation.setDeviceMetricsOverride', mobile
      ? { width:390, height:844, deviceScaleFactor:2, mobile:true }
      : { width:1440, height:960, deviceScaleFactor:1, mobile:false });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled:mobile, maxTouchPoints:mobile ? 5 : 1 });
    await page.navigate(url);
    console.log(mobile ? 'mobile: navigate' : 'desktop: navigate');
    await page.wait(`!!document.querySelector('[data-scroll-reader-ready="true"]')`, 'first tile ready', 30000);
    console.log(mobile ? 'mobile: ready' : 'desktop: ready');
    const initial = await page.evaluate(`(() => {
      const reader=document.querySelector('[data-scroll-reader-ready="true"]');
      const images=[...reader.querySelectorAll('[data-scroll-tile] img')];
      const resources=performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname.includes('/artifact-scroll-tiles/gg-qmsh/'));
      return {ready:reader.dataset.scrollReaderReady, scrollWidth:reader.scrollWidth, clientWidth:reader.clientWidth, images:images.map(image=>new URL(image.getAttribute('src'),location.href).pathname), requests:resources.map(entry=>new URL(entry.name).pathname), disclosure:document.querySelector('[role="dialog"]')?.textContent};
    })()`);
    assert.ok(initial.scrollWidth > initial.clientWidth * 5);
    assert.ok(initial.images.length < tiles.tiles.length / 2, 'all 20 tiles requested at once');
    assert.ok(initial.requests.every(path => path.includes('/artifact-scroll-tiles/gg-qmsh/')));
    assert.match(initial.disclosure, /当前文件授权待核/);
    assert.match(initial.disclosure, /原文件哈希与图像处理记录/);
    assert.match(initial.disclosure, /16000×770/);
    assert.ok(!initial.requests.some(path => path.includes('-scroll-detail-') || path.endsWith('gg-qmsh-reading.jpg')));
    const shot = await page.send('Page.captureScreenshot', { format:'png' });
    await writeFile(new URL(`${mobile ? 'mobile' : 'desktop'}-initial.png`, output), Buffer.from(shot.data, 'base64'));
    await page.evaluate(`(() => { const reader=document.querySelector('[data-scroll-reader-ready="true"]'); reader.scrollLeft=reader.scrollWidth-reader.clientWidth; })()`);
    await page.wait(`document.querySelector('[data-scroll-tile="19"] img')?.complete && document.querySelector('[data-scroll-tile="19"] img')?.naturalWidth===800`, 'last tile after fast jump', 30000);
    const far = await page.evaluate(`(() => { const reader=document.querySelector('[data-scroll-reader-ready="true"]'); return {progress:reader.scrollLeft/(reader.scrollWidth-reader.clientWidth), lastSrc:document.querySelector('[data-scroll-tile="19"] img').currentSrc}; })()`);
    assert.ok(far.progress > 0.99 && far.lastSrc.includes('/artifact-scroll-tiles/gg-qmsh/'));
    results.push({ device:mobile?'390px mobile':'1440px desktop', initialTileRequests:initial.requests.length, initialTileBytes:initial.requests.reduce((sum,path)=>sum+(tiles.tiles.find(tile=>tile.webp.src===path)?.webp.bytes??0),0), lastTileLoaded:true, disclosurePreserved:true });
    assert.deepEqual(page.errors, []);
    assert.deepEqual(page.failures.filter(item=>!/ERR_ABORTED/.test(item)), []);
  } finally {
    await page.close();
  }
}
{
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setBlockedURLs', { urls:[new URL(tiles.tiles[0].webp.src, base).href] });
    await page.navigate(url);
    await page.wait(`document.querySelector('[data-scroll-reader-ready="true"] [data-scroll-tile="0"] img')?.currentSrc.endsWith('.jpg')`, 'first WebP tile retries same-source JPEG', 30000);
    const disclosure = await page.evaluate(`document.querySelector('[role="dialog"]')?.textContent`);
    assert.match(disclosure, /授权状态：待核验/);
    results.push({ device:'failure recovery', firstWebpBlocked:true, sameSourceJpegReady:true, disclosurePreserved:true });
  } finally { await page.close(); }
}
await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2)+'\n');
console.log(JSON.stringify(results, null, 2));
