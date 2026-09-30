import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4176/';
const output = new URL('../docs/audits/story-browser/batch26/', import.meta.url);
await mkdir(output,{recursive:true});
const page = await createHeadlessPage();
const checks = [];
try {
  for (const mobile of [false,true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    const old = new URL(base);
    for (const [key,value] of Object.entries({province:'云南省',museum:'yunnan',artifact:'yn-dwy',era:'秦汉',category:'金银器'})) old.searchParams.set(key,value);
    await page.navigate(old.href);
    await page.wait(`new URLSearchParams(location.search).get('museum')==='guobo' && new URLSearchParams(location.search).get('province')==='北京市' && document.querySelector('#artifact-dialog-title')?.textContent.includes('滇王之印')`,`${device} migrated legacy URL`,30000);
    const oldState = await page.evaluate(`(() => ({params:Object.fromEntries(new URLSearchParams(location.search)),museum:document.querySelector('[aria-labelledby="artifact-dialog-title"]')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth}))()`);
    assert.equal(oldState.params.artifact,'yn-dwy'); assert.equal(oldState.params.era,'秦汉'); assert.equal(oldState.params.category,'金银器');
    assert.match(oldState.museum,/藏于 中国国家博物馆/); assert.ok(oldState.overflow<=1);
    checks.push(`${device}: legacy Yunnan URL recovers the National Museum object and keeps filters`);

    const direct = new URL(base);
    for (const [key,value] of Object.entries({province:'北京市',museum:'guobo',artifact:'yn-dwy',era:'秦汉',guide:'1',story:'yn-dwy'})) direct.searchParams.set(key,value);
    await page.navigate(direct.href);
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId==='yn-dwy'`,`${device} seal story`,30000);
    const storyState = await page.evaluate(`(() => ({location:document.querySelector('.story-location')?.textContent,chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,related:document.querySelectorAll('[data-related]').length,overflow:document.documentElement.scrollWidth-innerWidth}))()`);
    assert.match(storyState.location,/北京市.*中国国家博物馆/); assert.equal(storyState.chapters,4); assert.ok(storyState.details>=3); assert.ok(storyState.related>=2); assert.ok(storyState.overflow<=1);
    await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if (button?.getAttribute('aria-expanded')!=='true') button?.click(); })()`);
    await page.wait(`!!document.querySelector('#story-source-list a[href]')`,`${device} citations`);
    const citations = await page.evaluate(`([...document.querySelectorAll('#story-source-list a[href]')].map(a=>({text:a.textContent,href:a.href})))`);
    assert.ok(citations.some(item=>item.href.startsWith('https://www.chnmuseum.cn/zp/zpml/')));
    assert.ok(citations.some(item=>item.href.startsWith('https://www.ynrd.gov.cn/')));
    checks.push(`${device}: National Museum story, paragraph evidence, citations and viewport`);
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(page.failures.filter(error=>!/ERR_ABORTED/.test(error)),[]);
  await writeFile(new URL('results.json',output),JSON.stringify({base,passed:checks.length,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
