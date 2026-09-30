import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/image-metadata-browser/${scope}/`, import.meta.url);
await mkdir(output, { recursive:true });
const checks = [];

const resourcePaths = page => page.evaluate(`performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname)`);
const provenancePayloads = paths => paths.filter(path => /\/data\/image-provenance\/[a-z0-9-]+\.json$/.test(path));
async function screenshot(page, name) {
  const shot = await page.send('Page.captureScreenshot', { format:'png' });
  await writeFile(new URL(name, output), Buffer.from(shot.data, 'base64'));
}
async function withPage(metrics, run) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled:true });
    if (metrics) await page.send('Emulation.setDeviceMetricsOverride', metrics);
    if (metrics?.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  } finally { await page.close(); }
}

await withPage({ width:1440, height:960, deviceScaleFactor:1, mobile:false }, async page => {
  await page.navigate(new URL('?province=北京市&museum=gugong', base).href);
  await page.wait(`document.querySelector('h1')?.textContent.includes('故宫博物院') && [...document.querySelectorAll('button')].some(button => button.textContent.includes('清明上河图'))`, 'desktop museum cards');
  let paths = await resourcePaths(page);
  assert.deepEqual(provenancePayloads(paths), []);
  assert.equal(await page.evaluate(`document.body.textContent.includes('AI 复原示意')`), true);
  checks.push('desktop: 展厅卡片只用安全清单，未请求任何完整溯源payload');

  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('清明上河图')).click()`);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('清明上河图')`, 'Qingming detail');
  await page.wait(`performance.getEntriesByType('resource').some(entry => new URL(entry.name).pathname.endsWith('/data/image-provenance/gugong.json'))`, 'Gugong provenance request');
  await page.wait(`document.body.textContent.includes('待核验，不作为开放授权声明')`, 'pending source disclosure');
  await page.wait(`[...document.querySelectorAll('[aria-label]')].some(element => element.getAttribute('aria-label').includes('长卷阅卷台'))`, 'scroll detail role');
  paths = await resourcePaths(page);
  assert.deepEqual(provenancePayloads(paths), ['/data/image-provenance/gugong.json']);
  assert.equal(await page.evaluate(`document.body.textContent.includes('AI 复原示意 · 非文物实拍')`), false);
  await screenshot(page, 'desktop-qingming-detail.png');
  checks.push('desktop: 打开长卷详情只取故宫payload，并恢复来源详情图及pending授权披露');
});

await withPage({ width:1365, height:900, deviceScaleFactor:1, mobile:false }, async page => {
  await page.navigate(new URL('?province=北京市&museum=gugong&artifact=gg-gzdc', base).href);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('各种釉彩大瓶')`, 'AI detail');
  await page.wait(`document.body.textContent.includes('AI 复原示意 · 非文物实拍')`, 'AI disclosure');
  assert.equal(await page.evaluate(`document.body.textContent.includes('不用于认读铭文')`), true);
  assert.deepEqual(provenancePayloads(await resourcePaths(page)), ['/data/image-provenance/gugong.json']);
  checks.push('desktop: AI详情保持“非文物实拍”及细节限制，只加载当前馆payload');
});

await withPage({ width:390, height:844, deviceScaleFactor:2, mobile:true }, async page => {
  await page.navigate(new URL('?province=浙江省&museum=zhejiang&artifact=zj-yzj', base).href);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('战国越王者旨於睗剑')`, 'mobile verified detail');
  await page.wait(`document.body.textContent.includes('授权状态：CC0 1.0') && document.body.textContent.includes('原件与展示图证据已核')`, 'verified disclosure');
  assert.deepEqual(provenancePayloads(await resourcePaths(page)), ['/data/image-provenance/zhejiang.json']);
  assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
  await screenshot(page, 'mobile-verified-detail.png');
  checks.push('mobile: 直达已核详情只取浙江payload，完整授权/处理披露且无横向溢出');
});

await withPage({ width:390, height:844, deviceScaleFactor:2, mobile:true }, async page => {
  await page.send('Network.setBlockedURLs', { urls:['*/data/image-provenance/gugong.json'] });
  const direct = new URL('?province=北京市&museum=gugong&artifact=gg-qmsh&era=宋辽金元&category=书画', base).href;
  await page.navigate(direct);
  await page.wait(`document.body.textContent.includes('完整影像说明载入失败')`, 'provenance failure');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('artifact')`), 'gg-qmsh');
  assert.equal(await page.evaluate(`document.body.textContent.includes('当前只显示安全卡片预览')`), true);
  assert.equal(await page.evaluate(`!!document.querySelector('[role="dialog"] img')`), true);
  await screenshot(page, 'mobile-provenance-failure.png');
  await page.send('Network.setBlockedURLs', { urls:[] });
  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('重试影像资料')).click()`);
  await page.wait(`document.body.textContent.includes('待核验，不作为开放授权声明')`, 'provenance retry', 30000);
  assert.equal(await page.evaluate(`document.body.textContent.includes('完整影像说明载入失败')`), false);
  checks.push('mobile: 完整溯源失败时保留URL和安全预览，解除阻断后原位重试成功');
});

const result = { baseUrl:base, testedAt:new Date().toISOString(), passed:checks.length, checks };
await writeFile(new URL('results.json', output), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
