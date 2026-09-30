import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const out = new URL('../docs/audits/story-browser/local/', import.meta.url);
await mkdir(out, { recursive: true });
const cases = [
  ['hb-cxd', 'cx-guest', 'gx-yfd'],
  ['hub-zhy', 'bell-orchestra', 'sxl-lt'],
  ['gg-jgyg', 'cup-ritual-record', 'hb-cxd'],
  ['sxl-lt', 'camel-2025-care', 'hub-zhy'],
  ['gg-pft', 'pf-identity-debate', 'sh-dkd'],
];
const page = await createHeadlessPage();
const checks = [];
const query = id => {
  const u = new URL(base);
  for (const [key, value] of Object.entries({ province:'北京市', museum:'gugong', era:'魏晋南北朝', category:'书画', region:'北京市', guide:'1', story:id })) u.searchParams.set(key, value);
  return u.href;
};
async function tap(selector, mobile) {
  await page.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'}); let p=e.parentElement; while(p){ const style=getComputedStyle(p); if(p.scrollHeight>p.clientHeight+2 && /(auto|scroll)/.test(style.overflowY)){ const r=e.getBoundingClientRect(), pr=p.getBoundingClientRect(); if(r.top<pr.top || r.bottom>pr.bottom) p.scrollTop += r.top-pr.top-(p.clientHeight-r.height)/2; break; } p=p.parentElement; } })()`);
  await sleep(180);
  const p = await page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:Math.max(90,Math.min(innerHeight-36,r.y+Math.min(80,r.height/3))),rect:{top:r.top,bottom:r.bottom,height:r.height},viewport:innerHeight}; })()`);
  const hit = await page.evaluate(`(() => { const e=document.elementFromPoint(${p.x}, ${p.y})?.closest('a,button'); return {matches:e?.matches(${JSON.stringify(selector)}) ?? false, html:e?.outerHTML.slice(0,160) ?? ''}; })()`);
  assert.equal(hit.matches, true, `${selector} is not the touch target: ${JSON.stringify({p,hit})}`);
  const top = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]')?.scrollTop ?? 0`);
  if (mobile) {
    await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[p] });
    await page.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  } else {
    await page.send('Input.dispatchMouseEvent', { type:'mousePressed', ...p, button:'left', clickCount:1 });
    await page.send('Input.dispatchMouseEvent', { type:'mouseReleased', ...p, button:'left', clickCount:1 });
  }
  return top;
}
try {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width:mobile ? 390 : 1440, height:mobile ? 844 : 960, deviceScaleFactor:mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled:mobile, maxTouchPoints:5 });
    for (const [id, sourceId] of cases) {
      console.log(`${device}: ${id}`);
      await page.navigate(query(id));
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, id);
      await page.wait(`document.querySelectorAll('.story-chapters > section').length === 4`);
      const content = await page.evaluate(`(() => { const e=document.querySelector('.story-experience'); return { chapters:document.querySelectorAll('.story-chapters > section').length, details:document.querySelectorAll('.story-details li').length, overflow:e.scrollWidth-e.clientWidth, pageOverflow:document.documentElement.scrollWidth-innerWidth, search:location.search }; })()`);
      assert.equal(content.chapters, 4);
      assert.equal(content.details, 4);
      assert.ok(content.overflow <= 1 && content.pageOverflow <= 1, `${device} ${id}: ${JSON.stringify(content)}`);
      if (['hb-cxd', 'gg-jgyg', 'sxl-lt'].includes(id)) {
        await page.wait(`document.querySelector('.story-figure')?.textContent.includes('非文物实拍')`, `${id} AI disclosure`);
        assert.match(await page.evaluate(`document.querySelector('.story-figure').textContent`), /AI 复原示意.*非文物实拍/);
      }
      if (!await page.evaluate(`!!document.querySelector('#story-source-list')`)) await tap('.story-sources > button', mobile);
      await page.wait(`!!document.querySelector('#story-source-list')`);
      const source = await page.evaluate(`(() => { const el=[...document.querySelectorAll('#story-source-list a')].find(a=>a.href.includes(${JSON.stringify(sourceId === 'cx-guest' ? 'chnmus.net/sitesources/hnsbwy/page_pc/bwzl/zxgd/' : sourceId === 'bell-orchestra' ? 'hbww.org.cn/bzyt/p/9068' : sourceId === 'cup-ritual-record' ? 'dpm.org.cn/topic/zhongguo_commonhome' : sourceId === 'camel-2025-care' ? 'sxhm.com/info/news/detail/18496' : 'dpm.org.cn/Uploads/File/pdf/af/34/82/') })); return !!el && el.target === '_blank' && el.rel.includes('noreferrer'); })()`);
      assert.equal(source, true, `${device} ${id}: source ${sourceId} absent`);
      checks.push(`${device} ${id}: URL直达、四章、四细节、来源可点击、无横向溢出`);
      if (id === 'hb-cxd' || id === 'gg-pft') {
        const shot = await page.send('Page.captureScreenshot', { format:'png' });
        await writeFile(new URL(`batch5-${device}-${id}.png`, out), Buffer.from(shot.data, 'base64'));
      }
    }
    await page.navigate(query('gg-pft'));
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === 'gg-pft'`);
    const before = await tap('[data-related="sh-dkd"]', mobile);
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === 'sh-dkd'`);
    const params = await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
    for (const [k, v] of Object.entries({province:'北京市', museum:'gugong', era:'魏晋南北朝', category:'书画', region:'北京市'})) assert.equal(params[k], v);
    await page.evaluate('history.back()');
    await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === 'gg-pft'`);
    await sleep(450);
    const after = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    assert.ok(Math.abs(after - before) < 60, `${device}: scroll before ${before}, after ${after}`);
    checks.push(`${device}: 关联跳转保留筛选，浏览器返回恢复阅读位置`);
  }
  assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  console.log(JSON.stringify({ checks, errors:page.errors, failures:page.failures }, null, 2));
} finally { await page.close(); }
