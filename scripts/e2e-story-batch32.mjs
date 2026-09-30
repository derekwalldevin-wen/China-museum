import assert from 'node:assert/strict';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4176/';
const page = await createHeadlessPage();
const cases = [
  { id:'sxd-hjm', museum:'sanxingdui', province:'四川省', era:'先秦', source:'三星堆遗址祭祀区五号坑出土金面具', next:'js-hjm' },
  { id:'gs-yxt', museum:'gansu', province:'甘肃省', era:'魏晋南北朝', source:'J85M', next:'nj-zlqx' },
  { id:'nx-ljt', museum:'ningxia', province:'宁夏回族自治区', era:'宋辽金元', source:'鎏金铜牛', next:'gs-tbm' },
];
const url = params => { const next=new URL(base); for(const [key,value] of Object.entries(params)) next.searchParams.set(key,value); return next.href; };
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`,id,30000);
const checks=[];
try {
  for (const mobile of [false,true]) {
    const device=mobile?'mobile':'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    for(const item of cases) {
      await page.navigate(url({province:item.province,museum:item.museum,artifact:item.id,era:item.era,guide:'1',story:item.id})); await waitStory(item.id);
      const state=await page.evaluate(`(() => ({chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,related:document.querySelectorAll('[data-related]').length,overflow:document.documentElement.scrollWidth-innerWidth,params:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(state.chapters,4); assert.ok(state.details>=3); assert.ok(state.related>=2); assert.ok(state.overflow<=1,`${device}:${item.id}:overflow`);
      assert.equal(state.params.province,item.province); assert.equal(state.params.museum,item.museum); assert.equal(state.params.era,item.era);
      await page.evaluate(`(() => { const b=document.querySelector('.story-sources > button'); if(b?.getAttribute('aria-expanded')!=='true') b?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`,`${item.id}:sources`);
      const source=await page.evaluate(`!![...document.querySelectorAll('#story-source-list a[href]')].find(a=>a.textContent.includes(${JSON.stringify(item.source)})&&a.href.startsWith('https://'))`);
      assert.ok(source,`${device}:${item.id}:source`);
      const selector=`[data-related="${item.next}"]`;
      await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`); await sleep(180);
      const before=await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return r.y+r.height/2; })()`);
      if(mobile){const point=await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`); await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]}); await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await waitStory(item.next); await page.evaluate('history.back()'); await waitStory(item.id);
      await page.wait(`(() => {const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();return r&&Math.abs(r.y+r.height/2-${before})<60;})()`,`${device}:${item.id}:reading position`,6000);
      checks.push(`${device}:${item.id}:direct URL, cited source, related navigation, history, reading position`);
    }
  }
  assert.deepEqual(page.errors,[]); assert.deepEqual(page.failures.filter(error=>!/ERR_ABORTED/.test(error)),[]);
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
