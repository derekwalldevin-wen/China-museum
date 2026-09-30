import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const output = new URL('../docs/audits/story-browser/batch15/', import.meta.url);
await mkdir(output, { recursive: true });
const ids = ['sh-ltry', 'sz-lhw', 'sz-bz', 'sz-jx'];
const expectedSources = {
  'sh-ltry': '朱克柔 缂丝莲塘乳鸭图',
  'sz-lhw': '秘色瓷莲花碗的前世今生',
  'sz-bz': '宋代苏州出土漆器管窥',
  'sz-jx': '宋代苏州出土漆器管窥',
};
const checks = [];
const page = await createHeadlessPage();
const route = id => { const url = new URL(base); url.searchParams.set('province', '江苏省'); url.searchParams.set('era', '宋辽金元'); url.searchParams.set('guide', '1'); url.searchParams.set('story', id); return url.href; };
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, id, 30000);
try {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
    for (const id of ids) {
      await page.navigate(route(id)); await waitStory(id);
      const state = await page.evaluate(`(() => ({ id:document.querySelector('[data-story-id]')?.dataset.storyId, chapters:document.querySelectorAll('.story-chapters > section').length, details:document.querySelectorAll('.story-details li').length, related:document.querySelectorAll('[data-related]').length, overflow:document.documentElement.scrollWidth-innerWidth, params:Object.fromEntries(new URLSearchParams(location.search)) }))()`);
      assert.equal(state.id, id); assert.equal(state.chapters, 4); assert.equal(state.details, 3); assert.ok(state.related >= 2);
      assert.ok(state.overflow <= 1, `${device}:${id} horizontal overflow ${state.overflow}`);
      assert.equal(state.params.province, '江苏省'); assert.equal(state.params.era, '宋辽金元');
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if (button?.getAttribute('aria-expanded') !== 'true') button?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`, `${id} sources`);
      const source = await page.evaluate(`(() => { const a=[...document.querySelectorAll('#story-source-list a')].find(link=>link.textContent.includes(${JSON.stringify(expectedSources[id])})); return a && {href:a.href,target:a.target,rel:a.rel}; })()`);
      assert.ok(source?.href.startsWith('https://')); assert.equal(source.target, '_blank'); assert.match(source.rel, /noreferrer/);
      checks.push(`${device}:${id} direct URL, layers, comparison, source and viewport`);
      if (id === 'sz-bz') {
        await page.evaluate(`sessionStorage.removeItem('atlas-story-v1:sz-bz')`);
        await page.navigate(route(id)); await waitStory(id);
        await sleep(400);
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(new URL(`${device}-sz-bz.png`, output), Buffer.from(shot.data, 'base64'));
      }
    }
    await page.navigate(route('sz-bz')); await waitStory('sz-bz');
    await page.evaluate(`document.querySelector('[data-related="sz-jx"]').scrollIntoView({block:'center'})`);
    await sleep(180);
    const before = await page.evaluate(`(() => { const viewport=document.querySelector('[data-testid="story-viewport"]'); const rect=document.querySelector('[data-related="sz-jx"]').getBoundingClientRect(); return {top:viewport.scrollTop,y:rect.y+rect.height/2}; })()`);
    if (mobile) {
      const p = await page.evaluate(`(() => { const r=document.querySelector('[data-related="sz-jx"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await page.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[p]});
      await page.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    } else await page.evaluate(`document.querySelector('[data-related="sz-jx"]').click()`);
    await waitStory('sz-jx');
    await page.evaluate('history.back()'); await waitStory('sz-bz');
    try { await page.wait(`(() => { const rect=document.querySelector('[data-related="sz-jx"]')?.getBoundingClientRect(); return rect && Math.abs(rect.y+rect.height/2-${before.y})<60; })()`, `${device} scroll restoration`, 6000); }
    catch (error) { console.error(JSON.stringify({device,before,now:await page.evaluate(`(() => { const viewport=document.querySelector('[data-testid="story-viewport"]'); const rect=document.querySelector('[data-related="sz-jx"]').getBoundingClientRect(); return {top:viewport.scrollTop,y:rect.y+rect.height/2,stored:sessionStorage.getItem('atlas-story-v1:sz-bz')}; })()`)})); throw error; }
    const after = await page.evaluate(`(() => { const viewport=document.querySelector('[data-testid="story-viewport"]'); const rect=document.querySelector('[data-related="sz-jx"]').getBoundingClientRect(); return {top:viewport.scrollTop,y:rect.y+rect.height/2,stored:sessionStorage.getItem('atlas-story-v1:sz-bz')}; })()`);
    console.log(JSON.stringify({device,before,after}));
    const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
    assert.equal(params.province, '江苏省'); assert.equal(params.era, '宋辽金元');
    checks.push(`${device}:sz-bz → sz-jx touch/click, history, filter and reading position`);
  }
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.failures.filter(error => !/ERR_ABORTED/.test(error)), []);
  await writeFile(new URL('results.json', output), JSON.stringify({base, passed:checks.length, checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
