import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'https://huaxia-museum-atlas.pages.dev/';
const label = process.env.HUAXIA_DETAIL_METRICS_LABEL ?? 'baseline';
const outputPath = process.env.HUAXIA_DETAIL_METRICS_OUTPUT;
const waitForIdleProvenance = process.env.HUAXIA_WAIT_FOR_IDLE_PROVENANCE === 'true';
const galleryUrl = new URL('?province=北京市&museum=gugong', base).href;

const artifacts = {
  ordinary: { id: 'gg-gzdc', name: '各种釉彩大瓶', original: '/artifacts-v2/p1/gg-gzdc.png', scroll: false },
  scroll: { id: 'gg-qmsh', name: '《清明上河图》卷', original: '/artifact-sources/user-qingming/gg-qmsh-reading.jpg', scroll: true },
};

async function measure({ device, artifactKey, weak = false }) {
  const artifact = artifacts[artifactKey];
  const mobile = device === 'mobile';
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', mobile
      ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
      : { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
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
    await page.navigate(galleryUrl);
    await page.wait(`document.querySelector('h1')?.textContent.includes('故宫博物院')`, 'museum gallery');
    await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length >= ${mobile ? 2 : 4}`, 'initial card images', weak ? 60000 : 30000);
    if (waitForIdleProvenance) {
      await page.wait(`performance.getEntriesByType('resource').some(entry => new URL(entry.name).pathname.endsWith('/data/image-provenance/gugong.json') && entry.responseEnd > 0)`, 'idle provenance ready', weak ? 60000 : 30000);
    }
    const initialCardRequests = await page.evaluate(`performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.includes('-card-w')).length`);
    const selectorExpression = `[...document.querySelectorAll('[data-artifact-scroll-root] .grid > button')].find(button => button.textContent.includes(${JSON.stringify(artifact.name)}))`;
    await page.evaluate(`(${selectorExpression}).scrollIntoView({block:'center'})`);
    await sleep(weak ? 1200 : 350);
    await page.wait(`!!(${selectorExpression}).querySelector('img')?.naturalWidth`, 'target card image', weak ? 60000 : 30000);
    await page.evaluate(`(() => {
      performance.clearResourceTimings();
      window.__detailMetrics = { intent: null, click: null, dialog: null, imageDecoded: null, scrollReady: null };
      const expected = ${JSON.stringify(artifact.original)};
      let decoding = false;
      const inspect = () => {
        const metrics = window.__detailMetrics;
        if (!metrics.dialog && document.querySelector('[role="dialog"]')) metrics.dialog = performance.now();
        const image = [...document.querySelectorAll('[role="dialog"] img')].find(node => node.dataset.originalSrc === expected);
        if (image?.complete && image.naturalWidth > 0 && !decoding && !metrics.imageDecoded) {
          decoding = true;
          Promise.resolve(typeof image.decode === 'function' ? image.decode() : undefined)
            .catch(() => undefined)
            .then(() => { metrics.imageDecoded = performance.now(); });
        }
        const reader = document.querySelector('[aria-label$="长卷阅卷台"]');
        if (!metrics.scrollReady && reader?.getAttribute('tabindex') === '0') metrics.scrollReady = performance.now();
        if (!metrics.imageDecoded || (${artifact.scroll} && !metrics.scrollReady)) requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    })()`);
    const point = await page.evaluate(`(() => { const rect = (${selectorExpression}).getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+Math.min(rect.height/2,180)}; })()`);
    await page.evaluate(`window.__detailMetrics.intent = performance.now()`);
    if (mobile) {
      await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:point.x, y:point.y, radiusX:2, radiusY:2, force:1, id:1 }] });
      await sleep(80);
      await page.evaluate(`window.__detailMetrics.click = performance.now()`);
      await page.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    } else {
      await page.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:point.x, y:point.y });
      await sleep(250);
      await page.evaluate(`window.__detailMetrics.click = performance.now()`);
      await page.send('Input.dispatchMouseEvent', { type:'mousePressed', x:point.x, y:point.y, button:'left', clickCount:1 });
      await page.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:point.x, y:point.y, button:'left', clickCount:1 });
    }
    await page.wait(`window.__detailMetrics.dialog && window.__detailMetrics.imageDecoded${artifact.scroll ? ' && window.__detailMetrics.scrollReady' : ''}`, 'detail ready', weak ? 90000 : 45000);
    const snapshot = await page.evaluate(`(() => {
      const metrics = window.__detailMetrics;
      const entries = performance.getEntriesByType('resource').filter(entry => {
        const path = new URL(entry.name).pathname;
        return path.includes('/data/image-provenance/') || path.includes('-detail-') || path.includes('-scroll-detail-') || path === ${JSON.stringify(artifact.original)};
      }).map(entry => ({ url:entry.name, startTime:entry.startTime, responseEnd:entry.responseEnd, duration:entry.duration, bytes:entry.encodedBodySize || entry.transferSize || 0 }));
      return { metrics, entries, url:location.href, readerReady:document.querySelector('[aria-label$="长卷阅卷台"]')?.getAttribute('tabindex') === '0' };
    })()`);
    const { intent, click, dialog, imageDecoded, scrollReady } = snapshot.metrics;
    assert.ok(click >= intent && dialog >= click && imageDecoded >= dialog, JSON.stringify(snapshot));
    if (artifact.scroll) assert.ok(scrollReady >= dialog && snapshot.readerReady, JSON.stringify(snapshot));
    return {
      scenario: `${device}-${artifactKey}${weak ? '-weak' : ''}`,
      device,
      artifactId: artifact.id,
      weak,
      idleProvenanceReadyBeforeIntent: waitForIdleProvenance,
      initialCardRequests,
      intentToClickMs: click - intent,
      clickToDialogMs: dialog - click,
      clickToImageDecodedMs: imageDecoded - click,
      clickToScrollReadyMs: scrollReady ? scrollReady - click : null,
      intentToImageDecodedMs: imageDecoded - intent,
      detailRequests: snapshot.entries.map(entry => ({
        ...entry,
        startFromIntentMs: entry.startTime - intent,
        startFromClickMs: entry.startTime - click,
      })),
    };
  } finally {
    await page.close();
  }
}

const scenarios = [];
for (const device of ['desktop', 'mobile']) {
  for (const artifactKey of ['ordinary', 'scroll']) scenarios.push(await measure({ device, artifactKey }));
}
scenarios.push(await measure({ device:'mobile', artifactKey:'ordinary', weak:true }));
scenarios.push(await measure({ device:'mobile', artifactKey:'scroll', weak:true }));

const result = { label, baseUrl:base, measuredAt:new Date().toISOString(), scenarios };
if (outputPath) {
  const target = new URL(`file:///${outputPath.replaceAll('\\', '/')}`);
  await mkdir(new URL('.', target), { recursive:true });
  await writeFile(target, `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
