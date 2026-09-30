import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4176/';
const output = new URL('../docs/audits/story-browser/priority30/', import.meta.url);
await mkdir(output, { recursive: true });
const cases = [
  { id:'hb-cxd', province:'河北省', era:'秦汉', source:'长信宫灯‘出差’北京', next:'gx-yfd', detail:'数字发掘是今天的导览', chapter:'类型研究，不是本灯留存水迹' },
  { id:'hub-zhy', province:'湖北省', era:'先秦', source:'中国记忆——曾侯乙编钟出土45周年文献展', next:'sxl-lt', detail:'从随县汇报到原件赴京', chapter:'1978年3月6日王少泉致谭维四' },
  { id:'gg-jgyg', province:'北京市', era:'明清', source:'乾隆朝养心殿明窗贴落画探析', next:'hb-cxd', detail:'同名杯是复数', chapter:'以象鼻为足的做法却较少' },
  { id:'sxl-lt', province:'陕西省', era:'隋唐五代', source:'博物馆里寻丝路', next:'hub-zhy', detail:'今天的丝路课堂', chapter:'淤泥冲动使部分器物离开原位' },
  { id:'gg-pft', province:'北京市', era:'魏晋南北朝', source:'《平复帖》1947年修复记录', next:'sh-syt', detail:'三种‘保存’不是一回事', chapter:'不等于陆机在信纸上写下作品标题' },
];
const page = await createHeadlessPage();
const checks = [];
const route = item => {
  const url = new URL(base);
  for (const [key,value] of Object.entries({province:item.province,era:item.era,guide:'1',story:item.id})) url.searchParams.set(key,value);
  return url.href;
};
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`,id,30000);
try {
  for (const mobile of [false,true]) {
    const device = mobile ? 'mobile-390' : 'desktop-1440';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    for (const item of cases) {
      await page.navigate(route(item)); await waitStory(item.id);
      const state = await page.evaluate(`(() => ({id:document.querySelector('[data-story-id]')?.dataset.storyId,chapters:document.querySelectorAll('.story-chapters > section').length,chapterText:document.querySelector('.story-chapters')?.textContent,details:[...document.querySelectorAll('.story-details li')].map(el=>el.textContent),overflow:document.documentElement.scrollWidth-innerWidth,params:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(state.id,item.id); assert.equal(state.chapters,4);
      assert.ok(state.chapterText?.includes(item.chapter),`${device}:${item.id} chapter evidence`);
      assert.ok(state.details.some(text=>text.includes(item.detail)),`${device}:${item.id} new detail`);
      assert.ok(state.overflow<=1,`${device}:${item.id} overflow ${state.overflow}`);
      assert.equal(state.params.province,item.province); assert.equal(state.params.era,item.era);
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if(button?.getAttribute('aria-expanded')!=='true') button?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`,`${item.id} sources`);
      const source = await page.evaluate(`(() => { const a=[...document.querySelectorAll('#story-source-list a[href]')].find(link=>link.textContent.includes(${JSON.stringify(item.source)})); return a&&{href:a.href,target:a.target,rel:a.rel}; })()`);
      assert.ok(source?.href.startsWith('https://'),`${device}:${item.id} direct source URL`);
      assert.equal(source.target,'_blank'); assert.match(source.rel,/noreferrer/);
      checks.push(`${device}:${item.id} direct route, detail, source and width`);
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
      await page.wait(`(() => { const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r&&Math.abs(r.y+r.height/2-${before})<60; })()`,`${device}:${item.id} restore`,6000);
      const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
      assert.equal(params.province,item.province); assert.equal(params.era,item.era);
      checks.push(`${device}:${item.id} related jump, browser back and reading position`);
    }
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(page.failures.filter(error=>!/ERR_ABORTED/.test(error)),[]);
  await writeFile(new URL('results.json',output),JSON.stringify({base,passed:checks.length,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
