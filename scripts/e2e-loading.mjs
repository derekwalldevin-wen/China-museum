import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const output = new URL('../docs/audits/performance-loading/', import.meta.url);
await mkdir(output, { recursive:true });
const checks = [];
async function screenshot(page, name) {
  const shot = await page.send('Page.captureScreenshot', { format:'png' });
  await writeFile(new URL(name, output), Buffer.from(shot.data, 'base64'));
}

async function withPage(run) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled:true });
    await run(page);
  } finally { await page.close(); }
}

await withPage(async page => {
  await page.send('Network.setBlockedURLs', { urls:['*ScrollMapScene-*.js'] });
  await page.navigate(base);
  await page.wait(`document.body.textContent.includes('舆图暂未展开')`, 'map error recovery');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).toString()`), '');
  assert.equal(await page.evaluate(`document.body.textContent.includes('重新铺开舆图')`), true);
  await screenshot(page, 'map-failure.png');
  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('打开全国目录')).click()`);
  await page.wait(`document.querySelector('#region-directory-title')?.textContent.includes('全国博物馆目录')`, 'directory after map failure');
  checks.push('地图分块失败：显示卷轴错误态，可重试且全国目录仍可使用');
});

await withPage(async page => {
  await page.send('Network.setBlockedURLs', { urls:['*StoryExperience-*.js'] });
  await page.navigate(new URL('?province=北京市&museum=gugong&artifact=gg-qmsh&era=宋辽金元&category=书画&region=北京市&guide=1&trail=ink&story=gg-qmsh', base).href);
  await page.wait(`document.body.textContent.includes('故事卷暂未载入')`, 'story error recovery');
  const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
  assert.equal(params.story, 'gg-qmsh'); assert.equal(params.era, '宋辽金元'); assert.equal(params.region, '北京市');
  assert.equal(await page.evaluate(`document.body.textContent.includes('保留当前位置，重新载入')`), true);
  await screenshot(page, 'story-failure.png');
  checks.push('故事分块失败：保留故事、筛选与详情URL，并提供重载和退出');
});

await withPage(async page => {
  await page.send('Network.setBlockedURLs', { urls:['*MuseumDetail-*.js'] });
  await page.navigate(new URL('?province=北京市&museum=gugong&artifact=gg-qmsh', base).href);
  await page.wait(`document.body.textContent.includes('展厅暂未载入')`, 'museum error recovery');
  const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
  assert.equal(params.museum, 'gugong'); assert.equal(params.artifact, 'gg-qmsh');
  checks.push('展厅分块失败：保留馆藏URL并提供稳定全屏恢复界面');
});

await withPage(async page => {
  await page.send('Network.setBlockedURLs', { urls:['*gugong-*.js'] });
  await page.navigate(new URL('?province=北京市&museum=gugong&artifact=gg-qmsh&era=宋辽金元', base).href);
  await page.wait(`document.body.textContent.includes('馆藏资料暂未载入')`, 'museum payload error recovery');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('artifact')`), 'gg-qmsh');
  assert.equal(await page.evaluate(`document.body.textContent.includes('保留当前位置，重新载入')`), true);
  await page.send('Network.setBlockedURLs', { urls:[] });
  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('保留当前位置')).click()`);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('清明上河图')`, 'museum payload retry', 30000);
  checks.push('馆藏数据失败：保留直达URL，解除网络故障后原位重试成功');
});

await withPage(async page => {
  await page.send('Network.setBlockedURLs', { urls:['*artifact-search-*.json'] });
  await page.navigate(base);
  await page.evaluate(`(() => {const input=document.querySelector('input[aria-label="搜索博物馆或文物"]'),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'二三百名工匠');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();})()`);
  await page.wait(`document.body.textContent.includes('全文检索暂未载入')`, 'search corpus error recovery');
  assert.equal(await page.evaluate(`document.body.textContent.includes('名称与分类仍可用')`), true);
  await page.send('Network.setBlockedURLs', { urls:[] });
  await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('重试全文检索')).click()`);
  await page.wait(`[...document.querySelectorAll('[role="option"]')].some(item => item.textContent.includes('后母戊鼎'))`, 'search corpus retry', 30000);
  checks.push('全文检索失败：基础检索可用，解除网络故障后原位重试成功');
});

await withPage(async page => {
  await page.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
  await page.send('Network.emulateNetworkConditions', { offline:false, latency:700, downloadThroughput:100 * 1024, uploadThroughput:50 * 1024, connectionType:'cellular3g' });
  await page.navigate(base);
  await page.wait(`!!document.querySelector('[aria-label="打开故事导览"]')`);
  await page.evaluate(`document.querySelector('[aria-label="打开故事导览"]').click()`);
  await page.wait(`document.body.textContent.includes('故事正在展开')`, 'slow story placeholder');
  await sleep(350);
  assert.equal(await page.evaluate(`document.body.textContent.includes('正在取回故事正文与资料索引')`), true);
  const geometry = await page.evaluate(`({width:document.documentElement.scrollWidth, viewport:innerWidth})`);
  assert.ok(geometry.width <= geometry.viewport + 1, JSON.stringify(geometry));
  await screenshot(page, 'mobile-slow-story.png');
  await page.wait(`document.querySelectorAll('[data-trail]').length === 6`, 'story after slow network', 30000);
  checks.push('弱网手机：固定故事占位无横向溢出，加载完成后恢复六条游线');
});

const result = { baseUrl:base, testedAt:new Date().toISOString(), passed:checks.length, checks };
await writeFile(new URL('results.json', output), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
