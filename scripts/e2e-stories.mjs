import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';
const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const output = new URL(`../docs/audits/story-browser/${new URL(base).hostname === '127.0.0.1' ? 'local' : 'production'}/`, import.meta.url);
await mkdir(output, {recursive:true});
const data = JSON.parse(await readFile(new URL('../src/data/stories.json', import.meta.url), 'utf8'));
const batch2 = JSON.parse(await readFile(new URL('../src/data/stories-batch2.json', import.meta.url), 'utf8'));
const batch3 = JSON.parse(await readFile(new URL('../src/data/stories-batch3.json', import.meta.url), 'utf8'));
const batch4 = JSON.parse(await readFile(new URL('../src/data/stories-batch4.json', import.meta.url), 'utf8'));
const batch5 = JSON.parse(await readFile(new URL('../src/data/stories-batch5.json', import.meta.url), 'utf8'));
const batch6 = JSON.parse(await readFile(new URL('../src/data/stories-batch6.json', import.meta.url), 'utf8'));
const batch7 = JSON.parse(await readFile(new URL('../src/data/stories-batch7.json', import.meta.url), 'utf8'));
const batch8 = JSON.parse(await readFile(new URL('../src/data/stories-batch8.json', import.meta.url), 'utf8'));
const batch9 = JSON.parse(await readFile(new URL('../src/data/stories-batch9.json', import.meta.url), 'utf8'));
const batch10 = JSON.parse(await readFile(new URL('../src/data/stories-batch10.json', import.meta.url), 'utf8'));
const batch11 = JSON.parse(await readFile(new URL('../src/data/stories-batch11.json', import.meta.url), 'utf8'));
const batch12 = JSON.parse(await readFile(new URL('../src/data/stories-batch12.json', import.meta.url), 'utf8'));
const batch13 = JSON.parse(await readFile(new URL('../src/data/stories-batch13.json', import.meta.url), 'utf8'));
const batch14 = JSON.parse(await readFile(new URL('../src/data/stories-batch14.json', import.meta.url), 'utf8'));
const batch15 = JSON.parse(await readFile(new URL('../src/data/stories-batch15.json', import.meta.url), 'utf8'));
const batch16 = JSON.parse(await readFile(new URL('../src/data/stories-batch16.json', import.meta.url), 'utf8'));
const batch17 = JSON.parse(await readFile(new URL('../src/data/stories-batch17.json', import.meta.url), 'utf8'));
const batch18 = JSON.parse(await readFile(new URL('../src/data/stories-batch18.json', import.meta.url), 'utf8'));
const batch19 = JSON.parse(await readFile(new URL('../src/data/stories-batch19.json', import.meta.url), 'utf8'));
const batch20 = JSON.parse(await readFile(new URL('../src/data/stories-batch20.json', import.meta.url), 'utf8'));
const batch21 = JSON.parse(await readFile(new URL('../src/data/stories-batch21.json', import.meta.url), 'utf8'));
const batch22 = JSON.parse(await readFile(new URL('../src/data/stories-batch22.json', import.meta.url), 'utf8'));
const batch23 = JSON.parse(await readFile(new URL('../src/data/stories-batch23.json', import.meta.url), 'utf8'));
const batch24 = JSON.parse(await readFile(new URL('../src/data/stories-batch24.json', import.meta.url), 'utf8'));
const batch25 = JSON.parse(await readFile(new URL('../src/data/stories-batch25.json', import.meta.url), 'utf8'));
const batch26 = JSON.parse(await readFile(new URL('../src/data/stories-batch26.json', import.meta.url), 'utf8'));
const batch27 = JSON.parse(await readFile(new URL('../src/data/stories-batch27.json', import.meta.url), 'utf8'));
const batch28 = JSON.parse(await readFile(new URL('../src/data/stories-batch28.json', import.meta.url), 'utf8'));
const batch29 = JSON.parse(await readFile(new URL('../src/data/stories-batch29.json', import.meta.url), 'utf8'));
const batch31 = JSON.parse(await readFile(new URL('../src/data/stories-batch31.json', import.meta.url), 'utf8'));
const batch32 = JSON.parse(await readFile(new URL('../src/data/stories-batch32.json', import.meta.url), 'utf8'));
const batch34 = JSON.parse(await readFile(new URL('../src/data/stories-batch34.json', import.meta.url), 'utf8'));
const batch35 = JSON.parse(await readFile(new URL('../src/data/stories-batch35.json', import.meta.url), 'utf8'));
const batch36 = JSON.parse(await readFile(new URL('../src/data/stories-batch36.json', import.meta.url), 'utf8'));
const batch37 = JSON.parse(await readFile(new URL('../src/data/stories-batch37.json', import.meta.url), 'utf8'));
const batch38 = JSON.parse(await readFile(new URL('../src/data/stories-batch38.json', import.meta.url), 'utf8'));
const batch39 = JSON.parse(await readFile(new URL('../src/data/stories-batch39.json', import.meta.url), 'utf8'));
const batch40 = JSON.parse(await readFile(new URL('../src/data/stories-batch40.json', import.meta.url), 'utf8'));
const batch42 = JSON.parse(await readFile(new URL('../src/data/stories-batch42.json', import.meta.url), 'utf8'));
const batch43 = JSON.parse(await readFile(new URL('../src/data/stories-batch43.json', import.meta.url), 'utf8'));
const batch44 = JSON.parse(await readFile(new URL('../src/data/stories-batch44.json', import.meta.url), 'utf8'));
const batch45 = JSON.parse(await readFile(new URL('../src/data/stories-batch45.json', import.meta.url), 'utf8'));
const batch46 = JSON.parse(await readFile(new URL('../src/data/stories-batch46.json', import.meta.url), 'utf8'));
const batch47 = JSON.parse(await readFile(new URL('../src/data/stories-batch47.json', import.meta.url), 'utf8'));
const batch48 = JSON.parse(await readFile(new URL('../src/data/stories-batch48.json', import.meta.url), 'utf8'));
const batch49 = JSON.parse(await readFile(new URL('../src/data/stories-batch49.json', import.meta.url), 'utf8'));
const batch50 = JSON.parse(await readFile(new URL('../src/data/stories-batch50.json', import.meta.url), 'utf8'));
const batch51 = JSON.parse(await readFile(new URL('../src/data/stories-batch51.json', import.meta.url), 'utf8'));
const batch52 = JSON.parse(await readFile(new URL('../src/data/stories-batch52.json', import.meta.url), 'utf8'));
const batch53 = JSON.parse(await readFile(new URL('../src/data/stories-batch53.json', import.meta.url), 'utf8'));
const batch54 = JSON.parse(await readFile(new URL('../src/data/stories-batch54.json', import.meta.url), 'utf8'));
const batch55 = JSON.parse(await readFile(new URL('../src/data/stories-batch55.json', import.meta.url), 'utf8'));
const batch56 = JSON.parse(await readFile(new URL('../src/data/stories-batch56.json', import.meta.url), 'utf8'));
const batch57 = JSON.parse(await readFile(new URL('../src/data/stories-batch57.json', import.meta.url), 'utf8'));
const batch58 = JSON.parse(await readFile(new URL('../src/data/stories-batch58.json', import.meta.url), 'utf8'));
const batch59 = JSON.parse(await readFile(new URL('../src/data/stories-batch59.json', import.meta.url), 'utf8'));
const batch60 = JSON.parse(await readFile(new URL('../src/data/stories-batch60.json', import.meta.url), 'utf8'));
const batch61 = JSON.parse(await readFile(new URL('../src/data/stories-batch61.json', import.meta.url), 'utf8'));
for (const batch of [batch2, batch3, batch4, batch5, batch6, batch7, batch8, batch9, batch10, batch11, batch12, batch13, batch14, batch15, batch16, batch17, batch18, batch19, batch20, batch21, batch22, batch23, batch24, batch25, batch26, batch27, batch28, batch29, batch31, batch32, batch34, batch35, batch36, batch37, batch38, batch39, batch40, batch42, batch43, batch44, batch45, batch46, batch47, batch48, batch49, batch50, batch51, batch52, batch53, batch54, batch55, batch56, batch57, batch58, batch59, batch60, batch61]) { data.sources.push(...batch.sources); data.trails.push(...batch.trails); data.stories.push(...batch.stories); }
data.stories = [...new Map(data.stories.map(story => [story.id, story])).values()];
const standaloneStories = [...batch3.stories, ...batch4.stories, ...batch5.stories, ...batch6.stories, ...batch7.stories, ...batch8.stories, ...batch9.stories, ...batch10.stories, ...batch11.stories, ...batch12.stories, ...batch13.stories, ...batch14.stories, ...batch15.stories, ...batch16.stories, ...batch18.stories, ...batch19.stories, ...batch20.stories, ...batch21.stories, ...batch22.stories, ...batch23.stories, ...batch24.stories, ...batch25.stories, ...batch26.stories, ...batch27.stories, ...batch28.stories, ...batch29.stories, ...batch31.stories, ...batch32.stories, ...batch34.stories, ...batch35.stories, ...batch36.stories, ...batch37.stories, ...batch38.stories, ...batch39.stories, ...batch40.stories, ...batch42.stories, ...batch43.stories, ...batch44.stories, ...batch45.stories, ...batch46.stories, ...batch47.stories, ...batch48.stories, ...batch49.stories, ...batch50.stories, ...batch51.stories, ...batch52.stories, ...batch53.stories, ...batch54.stories, ...batch55.stories, ...batch56.stories, ...batch57.stories, ...batch58.stories, ...batch59.stories, ...batch60.stories, ...batch61.stories];
const page = await createHeadlessPage(); const checks = [];
let mobile = false;
const url = params => { const u = new URL(base); for (const [k,v] of Object.entries(params)) u.searchParams.set(k,v); return u.href; };
const waitStory = async id => {
  await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, `story ${id}`);
  // Story navigation restores expanded panels and then settles web-font layout
  // before the next synthetic gesture. A human cannot target the new screen in
  // the same zero-frame gap that CDP can.
  await sleep(180);
};
async function tap(selector) {
  console.log(`tap ${mobile ? 'mobile' : 'desktop'} ${selector}`);
  await page.wait(`!!document.querySelector(${JSON.stringify(selector)})`, selector);
  await page.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'}); let p=e.parentElement; while(p){ const style=getComputedStyle(p); if(p.scrollHeight>p.clientHeight+2 && /(auto|scroll)/.test(style.overflowY)){ const r=e.getBoundingClientRect(), pr=p.getBoundingClientRect(); if(r.top<pr.top || r.bottom>pr.bottom) p.scrollTop += r.top-pr.top-(p.clientHeight-r.height)/2; break; } p=p.parentElement; } })()`);
  await sleep(120);
  const point = await page.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}), r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,top:document.querySelector('[data-testid="story-viewport"]')?.scrollTop,dialogTop:document.querySelector('[aria-labelledby="artifact-dialog-title"]')?.scrollTop}; })()`);
  console.log(JSON.stringify({point,hit:await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('a,button')?.outerHTML.slice(0,250)`)}));
  if (mobile) {
    await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
    await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {
    await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  }
  return point;
}
async function screenshot(name) {
  await sleep(350);
  const shot = await page.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL(name, output), Buffer.from(shot.data,'base64'));
}
async function geometry() {
  const result=await page.evaluate(`(() => { const d=document.querySelector('.story-experience'); return {overflow:d.scrollWidth-d.clientWidth, page:document.documentElement.scrollWidth-innerWidth, small:[...d.querySelectorAll('button,a')].filter(e=>e.getClientRects().length && e.getBoundingClientRect().height<43).map(e=>e.textContent.slice(0,30))}; })()`);
  assert.ok(result.overflow<=1 && result.page<=1, JSON.stringify(result)); assert.deepEqual(result.small,[]);
}
try {
  for (mobile of (process.env.HUAXIA_E2E_DEVICE === 'mobile' ? [true] : [false,true])) {
    const device=mobile?'mobile':'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    await page.navigate(new URL(base).href);
    await page.evaluate(`document.querySelector('.ink-intro-skip')?.click()`);
    await page.wait(`!document.querySelector('[data-ink-intro]') && document.querySelector('.atlas-topbar')?.getBoundingClientRect().top >= -0.1`, 'homepage controls settled after opening');
    await page.evaluate(`Object.keys(sessionStorage).filter(k=>k.startsWith('atlas-story-v1:')).forEach(k=>sessionStorage.removeItem(k))`);
    await tap('[aria-label="打开故事导览"]');
    await page.wait(`document.querySelectorAll('[data-trail]').length === 6`, 'six trails');
    await geometry(); await screenshot(`${device}-directory.png`);
    checks.push(`${device}: 首页六条游线入口、触控尺寸和无溢出`);
    assert.equal(await page.evaluate(`document.querySelectorAll('[data-standalone-story]').length`), standaloneStories.length);
    await tap('[data-standalone-story="gg-jgb"]'); await waitStory('gg-jgb');
    assert.match(await page.evaluate(`document.querySelector('.story-breadcrumb').textContent`), /单件故事/);
    await geometry(); await screenshot(`${device}-standalone.png`);
    checks.push(`${device}: ${standaloneStories.length}件独立故事目录可见、首件可触达且无溢出`);
    for (const item of standaloneStories) {
      await page.navigate(url({guide:'1',story:item.id,trail:'ink'})); await waitStory(item.id);
      assert.equal(await page.evaluate(`new URLSearchParams(location.search).has('trail')`),false);
      assert.equal(await page.evaluate(`document.querySelectorAll('.story-chapters > section').length`),4);
      assert.ok((await page.evaluate(`document.querySelectorAll('.story-details li').length`)) >= 3);
      assert.match(await page.evaluate(`document.querySelector('.story-breadcrumb').textContent`), /单件故事/);
      if (item.id === 'bj-hg') {
        const locationText = await page.evaluate(`document.querySelector('.story-location')?.textContent ?? ''`);
        assert.match(locationText, /馆藏：扶风县博物馆/);
        assert.match(locationText, /宝鸡青铜器博物院曾展出；当前展况待核/);
        assert.doesNotMatch(locationText, /藏于\s*宝鸡青铜器博物院/);
        checks.push(`${device}: 㝬簋故事正确区分扶风馆藏与宝鸡曾展`);
      }
      await geometry();
      checks.push(`${device}: ${item.id} 直达URL、内容层次与触控几何`);
    }
    await page.navigate(url({guide:'1',story:'sb-jd'})); await waitStory('sb-jd');
    await tap('[data-related="sb-bjl"]'); await waitStory('sb-bjl');
    await page.evaluate('history.back()'); await waitStory('sb-jd');
    checks.push(`${device}: 首博两件铭器关联跳转与历史返回`);
    for (const trail of data.trails) {
      await page.navigate(url({guide:'1',trail:trail.id}));
      await tap(`[data-start-trail="${trail.id}"]`);
      for (let i=0;i<trail.ids.length;i++) {
        const id=trail.ids[i]; await waitStory(id);
        console.log(`checked story ${device} ${id}`);
        await page.wait(`document.querySelectorAll('.story-chapters > section').length===4`);
        assert.ok((await page.evaluate(`document.querySelectorAll('.story-details li').length`)) >= 3);
        assert.equal(await page.evaluate(`document.querySelector('[data-story-id]').textContent.includes('第 ${i+1} / ${trail.ids.length} 站')`),true);
        await geometry();
        if (id==='sxl-lt' || id==='gg-jgyg') {
          await page.wait(`document.querySelector('.story-figure')?.textContent.includes('非文物实拍')`, 'AI illustration disclosure loaded');
          const disclosure = await page.evaluate(`document.querySelector('.story-figure')?.textContent ?? ''`);
          assert.match(disclosure,/AI 复原示意/);
          assert.match(disclosure,/非文物实拍/);
        }
        if (id==='hb-cxd') {
          await page.wait(`document.querySelector('.story-figure')?.textContent.includes('AI 复原示意 · 非文物实拍')`, 'story image disclosure');
          assert.match(await page.evaluate(`document.querySelector('.story-figure').textContent`),/AI 复原示意 · 非文物实拍/);
          await screenshot(`${device}-story-start.png`);
        }
        if (id==='gg-qmsh'||id==='gg-qljs') {
          await page.wait(`document.querySelector('.story-figure img')?.naturalWidth > 0`);
          if (id==='gg-qmsh') {
            await page.wait(`document.querySelector('.story-figure')?.textContent.includes('不含完整题跋')`, 'user scan disclosure');
            assert.doesNotMatch(await page.evaluate(`document.querySelector('.story-figure').textContent`), /低清历史缩图|AI 复原示意 · 非文物实拍/);
          } else {
            // 2026-09-30: the 900x36 thumbnail was replaced by a public-domain 16000x640
            // scan, so the reader must no longer warn about a low-resolution scroll. The
            // rendered candidate is viewport-sized by design (390px on mobile), so the
            // absolute resolution guarantee lives in collection.test.mjs instead.
            const figure = await page.evaluate(`document.querySelector('.story-figure')?.textContent ?? ''`);
            assert.doesNotMatch(figure, /低清历史缩图/, 'gg-qljs should no longer warn about a low-resolution scroll');
            const delivery = await page.evaluate(`(() => { const img = document.querySelector('.story-figure img'); return img ? { width: img.naturalWidth, src: img.currentSrc } : null; })()`);
            assert.ok(delivery && delivery.width > 0, 'gg-qljs story figure image must load');
            assert.match(delivery.src, /\/artifact-responsive\//, 'gg-qljs figure must be delivered through the responsive pipeline');
          }
        }
        const sourceCheck = {
          'gb-jgs': ['史记·滑稽列传', '原典·史料', 'ctext.org'],
          'hub-zhy': ['曾侯乙墓', '考古报告/书目', 'ndlsearch.ndl.go.jp'],
          'hb-cxd': ['满城汉墓发掘报告', '考古报告/书目', 'hbswwkg.com'],
          'gg-qmsh': ['东京梦华录', '原典·史料', 'ctext.org'],
          'hain-hgj': ['华光礁', '考古报告/书目', 'hainanmuseum.org']
        }[id];
        if (sourceCheck) {
          await page.evaluate(`document.querySelector('.story-sources > button')?.click()`);
          await page.wait(`document.querySelector('#story-source-list a[href]') && document.querySelector('#story-source-list').textContent.includes(${JSON.stringify(sourceCheck[1])})`, 'typed further-reading list');
          const hasSource = await page.evaluate(`(() => { const link=[...document.querySelectorAll('#story-source-list a')].find(a=>a.textContent.includes(${JSON.stringify(sourceCheck[0])}) && a.href.includes(${JSON.stringify(sourceCheck[2])})); return !!link && link.target==='_blank' && link.rel.includes('noreferrer'); })()`);
          assert.equal(hasSource,true,`${id} should expose a typed, clickable further-reading source`);
          checks.push(`${device}: ${id} 延伸阅读有类型标识并可点击到匹配来源`);
        }
        if(i<trail.ids.length-1) await tap('[data-story-next]');
        else assert.equal(await page.evaluate(`!!document.querySelector('.story-finish')`),true);
        checks.push(`${device}: ${id} 三层故事+延伸线索、三细节、路线站点与图像边界`);
      }
    }
    // A real museum detail stays mounted beneath the guide; filter URL keys never change.
    const original={province:'北京市',museum:'gugong',artifact:'gg-qmsh',era:'宋辽金元',category:'书画',region:'北京市'};
    await page.navigate(url(original));
    await page.wait(`!!document.querySelector('[aria-labelledby="artifact-dialog-title"]')`);
    await page.evaluate(`document.querySelector('[aria-labelledby="artifact-dialog-title"]').scrollTop=650`);
    const entry=await tap('[data-story-entry]');
    await waitStory('gg-qmsh');
    await tap('.story-reflection button');
    assert.equal(await page.evaluate(`document.querySelector('.story-reflection button').getAttribute('aria-expanded')`),'true');
    await screenshot(`${device}-reflection.png`);
    const before=await tap('[data-related="gg-qljs"]');
    await waitStory('gg-qljs');
    const actual=await page.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
    for(const [key,value]of Object.entries(original))assert.equal(actual[key],value);
    await page.evaluate('history.back()'); await waitStory('gg-qmsh'); await sleep(300);
    assert.equal(await page.evaluate(`document.querySelector('.story-reflection button').getAttribute('aria-expanded')`),'true');
    const backTop = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    const storedBack = await page.evaluate(`sessionStorage.getItem('atlas-story-v1:gg-qmsh')`);
    assert.ok(Math.abs(backTop-before.top)<48,`story back restores within one line after browser scroll-range clamping: before=${before.top}, back=${backTop}, stored=${storedBack}`);
    checks.push(`${device}: 有理由跨文物跳转，后退恢复阅读位置与解释展开`);
    const beforeReload = await page.evaluate('performance.timeOrigin');
    await page.send('Page.reload',{ignoreCache:true});
    await page.wait(`performance.timeOrigin !== ${beforeReload} && document.readyState === 'complete'`);
    await waitStory('gg-qmsh');
    assert.equal(await page.evaluate(`document.querySelector('.story-reflection button').getAttribute('aria-expanded')`),'true');
    // Provenance for the scroll figure arrives separately from story text;
    // mobile disclosure height can grow after reload, so verify the reading
    // anchor after that asynchronous layout settles rather than at a fixed ms.
    await page.wait(`(() => { const r=document.querySelector('[data-related="gg-qljs"]')?.getBoundingClientRect(); return r && Math.abs(r.top+r.height/2-${before.y})<48; })()`, 'reloaded story reading anchor', 6000);
    const reloadTop = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    const reloadAnchorY = await page.evaluate(`(() => { const r=document.querySelector('[data-related="gg-qljs"]').getBoundingClientRect(); return r.top+r.height/2; })()`);
    assert.ok(Math.abs(reloadAnchorY-before.y)<48,`story reload restores the same reading anchor within one line: beforeY=${before.y}, reloadY=${reloadAnchorY}, beforeTop=${before.top}, reloadTop=${reloadTop}`);
    await page.evaluate('history.forward()'); await waitStory('gg-qljs');
    await tap('[aria-label="退出故事导览"]');
    await page.wait(`!document.querySelector('.story-experience') && !new URLSearchParams(location.search).has('guide')`);
    const underlying=await page.evaluate(`({url:Object.fromEntries(new URLSearchParams(location.search)),top:document.querySelector('[aria-labelledby="artifact-dialog-title"]').scrollTop})`);
    assert.deepEqual(underlying.url, original); assert.ok(Math.abs(underlying.top-entry.dialogTop)<12, `Detail scroll: expected ${entry.dialogTop}, actual ${underlying.top}`);
    checks.push(`${device}: 刷新与前进恢复，退出回到原详情和筛选/滚动`);
    // Direct share: no fabricated parent history; exit must stay on this site and close guide.
    await page.navigate(url({story:'gg-qmsh',trail:'light'})); await waitStory('gg-qmsh');
    assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('trail')`),'ink');
    await tap('[data-related="gg-qljs"]'); await waitStory('gg-qljs');
    await tap('[aria-label="退出故事导览"]'); await page.wait(`!document.querySelector('.story-experience')`);
    assert.equal(await page.evaluate('location.origin'),new URL(base).origin);
    await page.navigate(url({guide:'1',story:'missing',trail:'missing'}));
    await page.wait(`document.querySelectorAll('[data-trail]').length===6`);
    checks.push(`${device}: 分享直达、错误游线纠正、未知文物回到目录、安全退出`);
  }
  assert.deepEqual(page.errors,[],'uncaught browser errors');
  assert.deepEqual(page.failures.filter(e=>!/ERR_ABORTED/.test(e)),[],'unexpected network failures');
  await writeFile(new URL('results.json',output),JSON.stringify({baseUrl:base,testedAt:new Date().toISOString(),passed:checks.length,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} catch (error) {
  await screenshot('failure.png').catch(() => {});
  console.error(await page.evaluate(`JSON.stringify({url:location.href,story:document.querySelector('[data-story-id]')?.dataset.storyId,top:document.querySelector('[data-testid="story-viewport"]')?.scrollTop})`).catch(()=>'diagnostics unavailable'));
  throw error;
} finally { await page.close(); }
