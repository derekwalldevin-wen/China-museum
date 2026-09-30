import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4176/';
const output = new URL('../docs/audits/story-browser/batch28/', import.meta.url);
await mkdir(output, { recursive: true });
const cases = [
  { id:'zj-yzj', era:'先秦', source:'者旨於剑：千年越剑的传奇', next:'gs-tbm' },
  { id:'zj-aywt', era:'隋唐五代', source:'鎏金银阿育王塔：千年等一回的雷峰塔故事', next:'dz-zlj' },
];
const page = await createHeadlessPage();
const checks = [];
const route = item => {
  const url = new URL(base);
  for (const [key, value] of Object.entries({province:'浙江省',era:item.era,guide:'1',story:item.id})) url.searchParams.set(key,value);
  return url.href;
};
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`,id,30000);
try {
  for (const mobile of [false,true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    for (const item of cases) {
      await page.navigate(route(item)); await waitStory(item.id);
      const state = await page.evaluate(`(() => ({id:document.querySelector('[data-story-id]')?.dataset.storyId,chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,related:document.querySelectorAll('[data-related]').length,overflow:document.documentElement.scrollWidth-innerWidth,params:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(state.id,item.id); assert.equal(state.chapters,4); assert.ok(state.details>=3); assert.ok(state.related>=2);
      assert.ok(state.overflow<=1,`${device}:${item.id} horizontal overflow ${state.overflow}`);
      assert.equal(state.params.province,'浙江省'); assert.equal(state.params.era,item.era);
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if(button?.getAttribute('aria-expanded')!=='true') button?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`,`${item.id} sources`);
      const source = await page.evaluate(`(() => { const a=[...document.querySelectorAll('#story-source-list a[href]')].find(link=>link.textContent.includes(${JSON.stringify(item.source)})); return a&&{href:a.href,target:a.target,rel:a.rel}; })()`);
      assert.ok(source?.href.startsWith('https://'),`${device}:${item.id} source URL`);
      assert.equal(source.target,'_blank'); assert.match(source.rel,/noreferrer/);
      checks.push(`${device}:${item.id} direct URL, source disclosure and width`);
      const selector = `[data-related="${item.next}"]`;
      await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
      await sleep(180);
      const before = await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return r.y+r.height/2; })()`);
      if (mobile) {
        const point = await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
        await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
        await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      } else await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await waitStory(item.next);
      await page.evaluate('history.back()'); await waitStory(item.id);
      await page.wait(`(() => { const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r&&Math.abs(r.y+r.height/2-${before})<60; })()`,`${device}:${item.id} position`,6000);
      const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
      assert.equal(params.province,'浙江省'); assert.equal(params.era,item.era);
      checks.push(`${device}:${item.id} cross-story comparison, history and reading position`);
    }
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(page.failures.filter(error=>!/ERR_ABORTED/.test(error)),[]);
  await writeFile(new URL('results.json',output),JSON.stringify({base,passed:checks.length,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
