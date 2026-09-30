import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';
import { museums } from '../src/data/museums.ts';
import { provinces } from '../src/data/provinces.ts';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = process.env.HUAXIA_E2E_SCOPE ?? (new URL(base).hostname === '127.0.0.1' ? 'local' : 'production');
const output = new URL(`../docs/audits/map-browser/${scope}/`, import.meta.url);
await mkdir(output, { recursive:true });
const page = await createHeadlessPage();
const checks = [];
let mobile = false;

async function tapLabel(name) {
  const point = await page.evaluate(`(() => {
    const group=[...document.querySelectorAll('g.scroll-label')].find(node => node.getAttribute('aria-label')?.startsWith(${JSON.stringify(name + '，')}));
    if (!group) return null;
    const matrix=group.getScreenCTM(), point=new DOMPoint(0,0).matrixTransform(matrix);
    return {x:point.x,y:point.y};
  })()`);
  assert.ok(point, name);
  if (mobile) {
    await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {
    await page.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  }
}

async function waitMap() {
  await page.wait(`document.querySelectorAll('g.scroll-province').length === 34 && document.querySelectorAll('g.scroll-label').length === 34`, `${mobile ? 'mobile' : 'desktop'} 34-region map`, 30000);
}

async function dismissOpening() {
  if (!await page.evaluate(`!!document.querySelector('.ink-intro-skip')`)) return;
  await page.evaluate(`document.querySelector('.ink-intro-skip').click()`);
  await page.wait(`!document.querySelector('[data-ink-intro]')`, 'opening dismissal');
}

async function screenshot(name) {
  await sleep(250);
  const shot=await page.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL(name, output), Buffer.from(shot.data,'base64'));
}

try {
  for (mobile of [false,true]) {
    const device=mobile?'mobile':'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    await page.send('Network.setCacheDisabled',{cacheDisabled:true});
    await page.navigate(base); await dismissOpening(); await waitMap();
    await page.wait(`!!document.querySelector('.scroll-painted-backdrop img')?.naturalWidth`, `${device} decorative artwork`, 30000);
    await page.wait(`!!document.querySelector('.scroll-art-disclosure')`, `${device} artwork disclosure committed`);
    await page.evaluate(`Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})))`);
    const shell=await page.evaluate(`(() => {
      const art=document.querySelector('.scroll-painted-backdrop img');
      const disclosure=document.querySelector('.scroll-art-disclosure');
      const bounds=disclosure?.getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-innerWidth,provinces:document.querySelectorAll('g.scroll-province').length,labels:document.querySelectorAll('g.scroll-label').length,artReady:!!art?.naturalWidth,disclosureVisible:!!bounds && bounds.left>=0 && bounds.right<=innerWidth};
    })()`);
    assert.deepEqual(shell,{overflow:0,provinces:34,labels:34,artReady:true,disclosureVisible:true});
    await screenshot(`${device}-map.png`);
    checks.push(`${device}: 原创山水背景、AI 标识、34省标签、无横向溢出`);

    for (const province of provinces) {
      await tapLabel(province.name);
      await page.wait(`new URLSearchParams(location.search).get('province') === ${JSON.stringify(province.name)} && !!document.querySelector(${JSON.stringify(`[aria-label="${province.name}博物馆列表"]`)})`, `${device} opens ${province.name}`);
      const expected=museums.filter(museum => museum.province===province.name).length;
      const actual=await page.evaluate(`document.querySelectorAll(${JSON.stringify(`[aria-label="${province.name}博物馆列表"] button[aria-label^="进入"]`)}).length`);
      assert.equal(actual,expected,`${device}:${province.name}`);
      assert.equal(await page.evaluate(`document.querySelectorAll('g.scroll-museum-marker').length`),expected,`${device}:markers:${province.name}`);
      await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(`关闭${province.name}博物馆列表`)}).click()`);
      await page.wait(`!new URLSearchParams(location.search).has('province') && !document.querySelector(${JSON.stringify(`[aria-label="${province.name}博物馆列表"]`)})`, `${device} closes ${province.name}`);
    }
    checks.push(`${device}: 34省逐一真实${mobile?'触摸':'鼠标'}命中，省卷和博物馆朱印数量一致`);

    if (!mobile) {
      const expected={lng:'116.41',lat:'39.90'};
      await page.evaluate(`(() => {
        const group=[...document.querySelectorAll('g.scroll-province')].find(node => node.getAttribute('aria-label')?.startsWith('北京市，'));
        const svg=group.ownerSVGElement, m=svg.getScreenCTM();
        const x=104+((116.405285-72)/64)*894, y=74+((55-39.904989)/39)*526;
        const p=new DOMPoint(x,y).matrixTransform(m);
        group.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:p.x,clientY:p.y,pointerType:'mouse'}));
      })()`);
      await page.wait(`document.body.textContent.includes('N ${expected.lat}°') && document.body.textContent.includes('E ${expected.lng}°')`, 'coordinate readout');
      checks.push('desktop: 北京已知坐标投影回读为N39.90° E116.41°');

      await tapLabel('西藏自治区');
      await page.wait(`document.querySelectorAll('g.scroll-museum-marker').length > 0`, 'Tibet museum marker');
      const marker=await page.evaluate(`(() => {const g=document.querySelector('g.scroll-museum-marker'),m=g.getScreenCTM(),p=new DOMPoint(0,0).matrixTransform(m);return {x:p.x,y:p.y,id:g.getAttribute('aria-label')};})()`);
      await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:marker.x,y:marker.y,button:'left',clickCount:1});
      await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:marker.x,y:marker.y,button:'left',clickCount:1});
      await page.wait(`new URLSearchParams(location.search).has('museum') && !!document.querySelector('h1')`, 'museum marker opens gallery');
      checks.push(`desktop: ${marker.id}朱印真实点击进入展厅`);
    } else {
      for (const name of ['香港特别行政区','澳门特别行政区']) {
        await tapLabel(name);
        await page.wait(`new URLSearchParams(location.search).get('province') === ${JSON.stringify(name)}`, `touch leader ${name}`);
        await page.evaluate(`[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(`关闭${name}博物馆列表`)}).click()`);
        await page.wait(`!new URLSearchParams(location.search).has('province')`, `close ${name}`);
      }
      checks.push('mobile: 港澳偏移引线印章以原生触摸再次命中');
    }
  }
  const result={baseUrl:base,testedAt:new Date().toISOString(),passed:checks.length,checks};
  await writeFile(new URL('results.json',output),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} catch(error) {
  await screenshot('failure.png').catch(()=>{});
  throw error;
} finally { await page.close(); }
