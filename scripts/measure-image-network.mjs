import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const baseUrl = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const outputPath = process.env.HUAXIA_IMAGE_METRICS_OUTPUT;
const artifactPattern = /\/(?:artifacts|artifacts-v2|artifact-sources|artifact-responsive)\//;

async function measure(viewport, label) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', viewport);
    await page.send('Emulation.setTouchEmulationEnabled', {
      enabled: viewport.mobile,
      maxTouchPoints: viewport.mobile ? 5 : 1,
    });
    await page.navigate(new URL('?province=北京市&museum=gugong', baseUrl).href);
    await page.wait(`document.querySelector('h1')?.textContent.includes('故宫博物院')`, `${label} museum`);
    await page.wait(`document.querySelectorAll('img').length > 0`, `${label} card images`);
    await sleep(1800);
    const result = await page.evaluate(`(() => {
      const artifactPattern = ${artifactPattern};
      const entries = performance.getEntriesByType('resource')
        .filter(entry => artifactPattern.test(new URL(entry.name).pathname))
        .map(entry => ({
          url: entry.name,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          startTime: entry.startTime,
          responseEnd: entry.responseEnd,
          duration: entry.duration,
        }));
      const visibleImages = [...document.querySelectorAll('img')].filter(image => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }).map(image => ({ src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight }));
      const cardImages = [...document.querySelectorAll('picture img')].map((image, index) => {
        const rect = image.getBoundingClientRect();
        return {
          index,
          originalSrc: image.dataset.originalSrc,
          currentSrc: image.currentSrc,
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          visible: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
        };
      });
      const bytes = entry => entry.encodedBodySize || entry.transferSize || 0;
      return {
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        requestCount: entries.length,
        transferredBytes: entries.reduce((sum, entry) => sum + bytes(entry), 0),
        maximumSingleImageBytes: Math.max(0, ...entries.map(bytes)),
        entries,
        visibleImages,
        cardImages,
      };
    })()`);
    if (page.errors.length) throw new Error(JSON.stringify(page.errors));
    return { label, ...result };
  } finally {
    await page.close();
  }
}

const results = {
  baseUrl,
  measuredAt: new Date().toISOString(),
  note: 'Museum gallery above-the-fold artifact image traffic with browser cache disabled.',
  scenarios: [
    await measure({ width: 1440, height: 960, deviceScaleFactor: 1, mobile: false }, 'desktop'),
    await measure({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, 'mobile'),
  ],
};

if (outputPath) {
  const target = new URL(`file:///${outputPath.replaceAll('\\', '/')}`);
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, `${JSON.stringify(results, null, 2)}\n`);
}
console.log(JSON.stringify(results, null, 2));
