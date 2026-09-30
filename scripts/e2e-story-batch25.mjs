import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const output = new URL('../docs/audits/story-browser/batch25/', import.meta.url);
await mkdir(output, { recursive: true });
const items = [
  { id:'ah-yqz', province:'安徽省', era:'宋辽金元', source:'温酒话诗书' },
  { id:'sd-hts', province:'山东省', era:'先秦', source:'大汶口遗址出土典型陶器' },
];
const checks = [];
const page = await createHeadlessPage();
const route = item => {
  const url = new URL(base);
  for (const [key,value] of Object.entries({province:item.province,era:item.era,guide:'1',story:item.id})) url.searchParams.set(key,value);
  return url.href;
};
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, id, 30000);
try {
  for (const mobile of [false,true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    for (const item of items) {
      await page.navigate(route(item)); await waitStory(item.id);
      const state = await page.evaluate(`(() => ({id:document.querySelector('[data-story-id]')?.dataset.storyId,chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,related:document.querySelectorAll('[data-related]').length,overflow:document.documentElement.scrollWidth-innerWidth,params:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(state.id,item.id); assert.equal(state.chapters,4); assert.ok(state.details>=3); assert.ok(state.related>=2);
      assert.ok(state.overflow<=1,`${device}:${item.id} overflow ${state.overflow}`);
      assert.equal(state.params.province,item.province); assert.equal(state.params.era,item.era);
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if (button?.getAttribute('aria-expanded') !== 'true') button?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`,`${item.id} sources`);
      const source = await page.evaluate(`(() => { const a=[...document.querySelectorAll('#story-source-list a[href]')].find(link=>link.textContent.includes(${JSON.stringify(item.source)})); return a&&{href:a.href,target:a.target,rel:a.rel}; })()`);
      assert.ok(source?.href.startsWith('https://'),`${device}:${item.id} source`); assert.equal(source.target,'_blank'); assert.match(source.rel,/noreferrer/);
      checks.push(`${device}:${item.id} direct URL, citations, filters and viewport`);
    }
    await page.navigate(route(items[0])); await waitStory(items[0].id);
    await page.evaluate(`document.querySelector('[data-related="sd-hts"]').scrollIntoView({block:'center'})`);
    await sleep(150);
    const before = await page.evaluate(`(() => { const r=document.querySelector('[data-related="sd-hts"]').getBoundingClientRect(); return r.y+r.height/2; })()`);
    if (mobile) {
      const p = await page.evaluate(`(() => { const r=document.querySelector('[data-related="sd-hts"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
      await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else await page.evaluate(`document.querySelector('[data-related="sd-hts"]').click()`);
    await waitStory('sd-hts');
    await page.evaluate('history.back()'); await waitStory('ah-yqz');
    await page.wait(`(() => { const r=document.querySelector('[data-related="sd-hts"]')?.getBoundingClientRect(); return r&&Math.abs(r.y+r.height/2-${before})<60; })()`,`${device} reading position`,6000);
    const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
    assert.equal(params.province,'安徽省'); assert.equal(params.era,'宋辽金元');
    checks.push(`${device}: related jump, history back, filters and reading position`);
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(page.failures.filter(error=>!/ERR_ABORTED/.test(error)),[]);
  await writeFile(new URL('results.json',output),JSON.stringify({base,passed:checks.length,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
