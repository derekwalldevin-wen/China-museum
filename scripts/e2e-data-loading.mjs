import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';
import museumIndex from '../src/data/museum-index.json' with { type:'json' };

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/data-loading-browser/${scope}/`, import.meta.url);
await mkdir(output, { recursive:true });
const museumIds = museumIndex.map(museum => museum.id);
const checks = [];

const resourcePaths = page => page.evaluate(`performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname)`);
const loadedPayloadIds = paths => museumIds.filter(id => paths.some(path => new RegExp('/' + id + '-[A-Za-z0-9_-]+\\.js$').test(path)));
async function setSearch(page, value) {
  await page.evaluate(`(() => { const input=document.querySelector('input[aria-label="搜索博物馆或文物"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); input.focus(); })()`);
}
const desktop = await createHeadlessPage();
try {
  await desktop.send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  await desktop.send('Network.setCacheDisabled',{cacheDisabled:true});
  await desktop.navigate(base);
  await desktop.wait(`document.querySelectorAll('g.scroll-province').length === 34`, 'initial map');
  let paths = await resourcePaths(desktop);
  assert.deepEqual(loadedPayloadIds(paths), []);
  assert.equal(paths.some(path => /artifact-search-.*\.json$/.test(path)), false);
  checks.push('desktop: 首屏未请求59馆完整payload或全文检索语料');

  await setSearch(desktop, '二三百名工匠');
  await desktop.wait(`performance.getEntriesByType('resource').some(entry => /artifact-search-.*\\.json$/.test(entry.name))`, 'lazy search corpus');
  await desktop.wait(`[...document.querySelectorAll('[role="option"]')].some(item => item.textContent.includes('后母戊鼎'))`, 'story-only legacy search result');
  await desktop.evaluate(`[...document.querySelectorAll('[role="option"]')].find(item => item.textContent.includes('后母戊鼎')).click()`);
  await desktop.wait(`new URLSearchParams(location.search).get('museum') === 'guobo' && new URLSearchParams(location.search).get('artifact') === 'gb-hmwd' && document.querySelector('[role="dialog"]')?.textContent.includes('832.84公斤')`, 'search opens full artifact');
  paths = await resourcePaths(desktop);
  assert.deepEqual(loadedPayloadIds(paths), ['guobo']);
  checks.push('desktop: 故事正文旧检索命中保持，并只载入目标国博payload');
} finally { await desktop.close(); }

const mobile = await createHeadlessPage();
try {
  await mobile.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await mobile.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await mobile.send('Network.setCacheDisabled',{cacheDisabled:true});
  const direct = new URL('?province=湖北省&museum=hubei&artifact=hub-zhy&era=先秦&category=青铜器', base).href;
  await mobile.navigate(direct);
  await mobile.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('曾侯乙编钟')`, 'mobile direct artifact');
  let paths = await resourcePaths(mobile);
  assert.deepEqual(loadedPayloadIds(paths), ['hubei']);
  assert.equal(paths.some(path => /china-provinces\.(standard|compact)-.*\.js$/.test(path)), false);
  assert.equal(await mobile.evaluate(`new URLSearchParams(location.search).get('era') === '先秦' && new URLSearchParams(location.search).get('category') === '青铜器'`), true);
  checks.push('mobile: 分享URL直达详情只载当前馆，筛选保留且不下载地图几何');

  await mobile.navigate(new URL('?province=湖北省&museum=hubei', base).href);
  await mobile.wait(`document.querySelector('h1')?.textContent.includes('湖北省博物馆') && !document.querySelector('button[aria-label="关闭文物详情"]')`, 'mobile museum gallery');
  await sleep(100);
  const next = await mobile.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('下一馆'))?.outerHTML`);
  assert.ok(next);
  const point = await mobile.evaluate(`(() => {const e=[...document.querySelectorAll('button')].find(button => button.textContent.includes('下一馆')),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await mobile.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await mobile.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.wait(`new URLSearchParams(location.search).get('museum') === 'jingzhou' && document.querySelector('h1')?.textContent.includes('荆州博物馆')`, 'same province next museum');
  paths = await resourcePaths(mobile);
  assert.deepEqual(loadedPayloadIds(paths).sort(), ['hubei','jingzhou']);
  assert.equal(await mobile.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  checks.push('mobile: 同省切馆按需增加一个payload，无横向溢出');
} finally { await mobile.close(); }

const result={baseUrl:base,testedAt:new Date().toISOString(),passed:checks.length,checks};
await writeFile(new URL('results.json',output),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
