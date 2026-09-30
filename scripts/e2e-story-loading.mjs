import assert from 'node:assert/strict';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import catalog from '../src/data/story-catalog.json' with { type:'json' };
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const out = new URL('../docs/audits/story-browser/loading/', import.meta.url);
await mkdir(out, { recursive:true });
const assetNames = await readdir(new URL('../dist/assets/', import.meta.url));
const storyChunks = new Set(catalog.stories.map(({ id }) => assetNames.find(name => name.startsWith(`${id}-`) && name.endsWith('.js'))));
assert.equal(storyChunks.has(undefined), false);
const checks = [];
for (const mobile of [false, true]) {
  const device = mobile ? 'mobile' : 'desktop';
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled:true });
    await page.send('Emulation.setDeviceMetricsOverride', { width:mobile ? 390 : 1440, height:mobile ? 844 : 960, deviceScaleFactor:mobile ? 2 : 1, mobile });
    await page.navigate(new URL('?guide=1', base).href);
    await page.wait(`!!document.querySelector('[data-standalone-story="lb-gf"]')`, `${device} story directory`);
    const directory = await page.evaluate(`(() => ({count:document.querySelectorAll('[data-standalone-story]').length, resources:performance.getEntriesByType('resource').map(item=>new URL(item.name).pathname.split('/').at(-1)), overflow:document.documentElement.scrollWidth-innerWidth}))()`);
    assert.ok(directory.count >= 50);
    assert.equal(directory.resources.filter(name => storyChunks.has(name)).length, 0, `${device} directory requested story prose`);
    assert.ok(directory.overflow <= 1);
    checks.push(`${device}: directory loads without any story body`);
    await page.evaluate(`document.querySelector('[data-standalone-story="lb-gf"]').click()`);
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === 'lb-gf'`, `${device} selected story`);
    const selected = await page.evaluate(`performance.getEntriesByType('resource').map(item=>new URL(item.name).pathname.split('/').at(-1))`);
    assert.deepEqual(selected.filter(name => storyChunks.has(name)), [assetNames.find(name => name.startsWith('lb-gf-') && name.endsWith('.js'))]);
    checks.push(`${device}: selecting one story requests exactly its own body`);
  } finally { await page.close(); }

  const failedPage = await createHeadlessPage();
  try {
    await failedPage.send('Network.setCacheDisabled', { cacheDisabled:true });
    await failedPage.send('Emulation.setDeviceMetricsOverride', { width:mobile ? 390 : 1440, height:mobile ? 844 : 960, deviceScaleFactor:mobile ? 2 : 1, mobile });
    const file = assetNames.find(name => name.startsWith('gg-pft-') && name.endsWith('.js'));
    await failedPage.send('Network.setBlockedURLs', { urls:[`*${file}`] });
    await failedPage.navigate(new URL('?province=北京市&era=魏晋南北朝&guide=1&story=gg-pft', base).href);
    await failedPage.wait(`!!document.querySelector('[role="alert"] button')`, `${device} failure action`, 15000);
    const failedUrl = await failedPage.evaluate('location.search');
    await failedPage.send('Network.setBlockedURLs', { urls:[] });
    await failedPage.evaluate(`document.querySelector('[role="alert"] button').click()`);
    await failedPage.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === 'gg-pft'`, `${device} failure retry`, 15000);
    assert.equal(await failedPage.evaluate('location.search'), failedUrl);
    checks.push(`${device}: failed story chunk retries without losing URL filters`);
  } finally { await failedPage.close(); }
}
await writeFile(new URL('results.json', out), `${JSON.stringify({base,passed:checks.length,checks},null,2)}\n`);
console.log(JSON.stringify({passed:checks.length,checks},null,2));
