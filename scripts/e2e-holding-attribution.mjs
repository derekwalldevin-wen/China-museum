import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/holding-attribution-browser/${scope}/`, import.meta.url);
const checks = [];
await mkdir(output, { recursive: true });

for (const [device, width, mobile] of [['desktop', 1440, false], ['mobile', 390, true]]) {
  const page = await createHeadlessPage();
  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: mobile ? 2 : 1, mobile });
    if (mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    await page.navigate(new URL('?province=陕西省&museum=baoji&artifact=bj-hg', base).href);
    await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('㝬簋')`, `${device} direct artifact`);
    const detail = await page.evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ''`);
    assert.match(detail, /馆藏：扶风县博物馆/);
    assert.match(detail, /宝鸡青铜器博物院曾展出/);
    assert.doesNotMatch(detail, /藏于宝鸡青铜器博物院/);
    checks.push(`${device}: direct detail uses the verified holder and separates past exhibition`);

    await page.navigate(new URL('?province=陕西省&museum=baoji', base).href);
    await page.wait(`!!document.querySelector('[data-artifact-card="bj-hg"]')`, `${device} museum card`);
    const card = await page.evaluate(`document.querySelector('[data-artifact-card="bj-hg"]')?.textContent ?? ''`);
    assert.match(card, /馆藏：扶风县博物馆/);
    assert.match(card, /当前展况待核/);
    checks.push(`${device}: museum card carries holder and exhibition uncertainty`);

    await page.navigate(new URL('?era=先秦&category=青铜器&region=陕西省', base).href);
    await page.wait(`!!document.querySelector('#collection-results-title') && !!document.querySelector('[data-artifact-card="bj-hg"]')`, `${device} collection result`);
    const result = await page.evaluate(`document.querySelector('[data-artifact-card="bj-hg"]')?.parentElement?.textContent ?? ''`);
    assert.match(result, /馆藏：扶风县博物馆/);
    assert.match(result, /陕西省/);
    checks.push(`${device}: nationwide filters preserve the correct holder and province`);

    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  } finally {
    await page.close();
  }
}

const result = { baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks };
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
