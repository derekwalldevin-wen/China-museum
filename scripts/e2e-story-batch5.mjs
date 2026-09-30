import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const batchFile = ['6','7'].includes(process.env.HUAXIA_STORY_BATCH) ? `stories-batch${process.env.HUAXIA_STORY_BATCH}.json` : 'stories-batch5.json';
const data = JSON.parse(await readFile(new URL(`../src/data/${batchFile}`, import.meta.url), 'utf8'));
const cases = data.stories;
const page = await createHeadlessPage();
const results = [];
function url(id) {
  const u = new URL(base);
  for (const [key, value] of Object.entries({province:'北京市', museum:'gugong', era:'宋辽金元', category:'书画', region:'北京市', guide:'1', story:id})) u.searchParams.set(key, value);
  return u.href;
}
async function tap(selector, mobile) {
  await page.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); })()`);
  await sleep(220);
  const point = await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  const readingTop = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]')?.scrollTop ?? 0`);
  assert.equal(await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('a,button')?.matches(${JSON.stringify(selector)}) ?? false`), true, selector);
  if (mobile) {
    await page.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[point]});
    await page.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  } else {
    await page.send('Input.dispatchMouseEvent', {type:'mousePressed',...point,button:'left',clickCount:1});
    await page.send('Input.dispatchMouseEvent', {type:'mouseReleased',...point,button:'left',clickCount:1});
  }
  return readingTop;
}
try {
  for (const mobile of [false, true]) {
    const device = mobile ? '390px' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', {width:mobile ? 390 : 1440,height:mobile ? 844 : 960,deviceScaleFactor:mobile ? 2 : 1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled', {enabled:mobile,maxTouchPoints:5});
    for (const story of cases) {
      await page.navigate(url(story.id));
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(story.id)}`, story.id);
      await page.wait(`document.querySelectorAll('.story-chapters > section').length === 4`);
      const state = await page.evaluate(`(() => ({sections:document.querySelectorAll('.story-chapters > section').length, details:document.querySelectorAll('.story-details li').length, overflow:document.documentElement.scrollWidth-innerWidth, search:location.search}))()`);
      assert.equal(state.sections, 4);
      assert.equal(state.details, 3);
      assert.ok(state.overflow <= 1, `${device} ${story.id} overflow ${state.overflow}`);
      const params = new URLSearchParams(state.search);
      assert.equal(params.get('story'), story.id);
      assert.equal(params.get('province'), '北京市');
      assert.equal(params.get('museum'), 'gugong');
      assert.equal(params.get('era'), '宋辽金元');
      if (!await page.evaluate(`!!document.querySelector('#story-source-list')`)) await tap('.story-sources > button', mobile);
      await page.wait(`!!document.querySelector('#story-source-list')`);
      const links = await page.evaluate(`[...document.querySelectorAll('#story-source-list a')].map(a=>({href:a.href,target:a.target,rel:a.rel}))`);
      for (const ref of story.summaryRefs) {
        const source = data.sources.find(s => s.id === ref);
        assert.ok(links.some(link => link.href === source.url && link.target === '_blank' && link.rel.includes('noreferrer')), `${story.id}: ${ref}`);
      }
      if (story.id === 'hn-wzt') assert.equal(await page.evaluate(`document.querySelector('#story-source-list').textContent.includes('仅核读摘要与注释')`), true);
      if (story.id === 'sh-syt') assert.equal(await page.evaluate(`document.querySelector('#story-source-list').textContent.includes('仅核读可检索片段')`), true);
      results.push(`${device} ${story.id}: URL、四章、三细节、来源链接、无横向溢出`);
    }
    const fromId = cases[0].id;
    const toId = cases[0].related[0].id;
    await page.navigate(url(fromId));
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(fromId)}`);
    const before = await tap(`[data-related="${toId}"]`, mobile);
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(toId)}`);
    assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('museum')`), 'gugong');
    await page.evaluate('history.back()');
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(fromId)}`);
    await sleep(450);
    const after = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    assert.ok(Math.abs(after - before) < 60, `${device} reading position ${before} -> ${after}`);
    results.push(`${device}: 跨文物跳转、保留筛选、历史返回及阅读位置`);
  }
  assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  console.log(JSON.stringify({results,errors:page.errors,failures:page.failures},null,2));
} finally {
  await page.close();
}
