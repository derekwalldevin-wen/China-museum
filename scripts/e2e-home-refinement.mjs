import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const output = new URL('../docs/audits/home-refinement/local/', import.meta.url);
await mkdir(output, { recursive: true });
const results = [];

async function openHome(page) {
  const started = Date.now();
  await page.navigate(base);
  const navigationWallMs = Date.now() - started;
  if (await page.evaluate(`!!document.querySelector('.ink-intro-skip')`)) {
    await page.evaluate(`document.querySelector('.ink-intro-skip').click()`);
    await page.wait(`!document.querySelector('[data-ink-intro]')`, 'intro dismissed');
  }
  await page.wait(`document.querySelectorAll('g.scroll-province').length===34 && !!document.querySelector('.atlas-story-beacon')`, 'home ready', 60000);
  const mapWallMs = Date.now() - started;
  await page.wait(`!!document.querySelector('.scroll-painted-backdrop img')?.naturalWidth`, 'decorative artwork', 30000);
  const artWallMs = Date.now() - started;
  await sleep(1500);
  return { navigationWallMs, mapWallMs, artWallMs };
}

async function captureLayout({ width, height, mobile, name }) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
    await openHome(page);
    const layout = await page.evaluate(`(() => {
      const box = selector => { const b=document.querySelector(selector)?.getBoundingClientRect(); return b && {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}; };
      const credit = document.querySelector('#author');
      const creditBox = credit?.getBoundingClientRect();
      return {viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,header:box('.atlas-topbar'),prologue:box('.scroll-mobile-prologue'),paper:box('.scroll-paper'),story:box('.atlas-story-beacon'),storyButton:box('.atlas-story-beacon button'),footer:box('.atlas-footer'),disclosure:box('.scroll-art-disclosure'),storyColor:getComputedStyle(document.querySelector('.atlas-story-beacon h2')).color,storyBackground:getComputedStyle(document.querySelector('.atlas-story-beacon')).backgroundImage,credit:creditBox && {left:creditBox.left,right:creditBox.right,top:creditBox.top,bottom:creditBox.bottom,width:creditBox.width,height:creditBox.height,text:credit.textContent.trim(),visible:getComputedStyle(credit).opacity}};
    })()`);
    assert.ok(layout.overflow <= 1, `${name}: horizontal overflow`);
    assert.ok(layout.storyButton.height >= 44, `${name}: story touch target`);
    assert.ok(layout.disclosure.left >= 0 && layout.disclosure.right <= width, `${name}: AI disclosure clipped`);
    // Author credit: bottom-right of the homepage, inside the footer, never clipped.
    assert.ok(layout.credit, `${name}: author credit missing`);
    assert.equal(layout.credit.text, '作者：德里克文', `${name}: author credit wording`);
    assert.ok(layout.credit.right <= width && layout.credit.left >= 0, `${name}: author credit clipped`);
    assert.ok(layout.credit.bottom <= height && layout.credit.bottom > height * 0.75, `${name}: author credit must sit at the bottom of the page`);
    assert.ok(layout.credit.left > width * 0.5, `${name}: author credit must sit in the bottom-right half`);
    assert.ok(layout.credit.top >= layout.footer.top - 1 && layout.credit.bottom <= layout.footer.bottom + 1, `${name}: author credit must sit inside the footer band`);
    assert.equal(layout.credit.visible, '1', `${name}: author credit must be visible`);
    if (mobile) {
      assert.ok(layout.paper.bottom <= layout.story.top + 2, `${name}: map/story overlap`);
      assert.ok(layout.story.bottom <= layout.footer.top + 2, `${name}: story/footer overlap`);
      if (height > 720) {
        assert.ok(layout.prologue.height > 40, `${name}: missing prologue`);
        assert.ok(layout.prologue.bottom + 8 <= layout.paper.top, `${name}: prologue/map overlap`);
      }
    }
    const image = await page.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(`after-${name}.png`, output), Buffer.from(image.data, 'base64'));
    results.push({ name, layout });
    if (name === 'mobile') {
      await page.evaluate(`document.querySelector('.atlas-story-beacon button').click()`);
      await page.wait(`new URLSearchParams(location.search).get('story')==='gg-qmsh' && !!document.querySelector('[data-story-id="gg-qmsh"]')`, 'story note opens Qingming route', 30000);
      results.push({ name:'story-note-navigation', storyId:'gg-qmsh', opened:true });
    }
  } finally { await page.close(); }
}

await captureLayout({ width: 1440, height: 960, mobile: false, name: 'desktop' });
await captureLayout({ width: 390, height: 844, mobile: true, name: 'mobile' });
await captureLayout({ width: 390, height: 667, mobile: true, name: 'mobile-short' });

const failedArt = await createHeadlessPage();
try {
  await failedArt.send('Network.setCacheDisabled', { cacheDisabled:true });
  await failedArt.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
  await failedArt.send('Network.setBlockedURLs', { urls:['*shanhe-handscroll-mobile.jpg'] });
  await failedArt.navigate(base);
  if (await failedArt.evaluate(`!!document.querySelector('.ink-intro-skip')`)) {
    await failedArt.evaluate(`document.querySelector('.ink-intro-skip').click()`);
    await failedArt.wait(`!document.querySelector('[data-ink-intro]')`, 'intro dismissed');
  }
  await failedArt.wait(`document.querySelectorAll('g.scroll-province').length===34 && !!document.querySelector('.atlas-story-beacon')`, 'map with failed artwork', 60000);
  await failedArt.wait(`document.querySelector('.scroll-painted-backdrop img')?.complete`, 'failed artwork settled');
  assert.equal(await failedArt.evaluate(`document.querySelector('.scroll-painted-backdrop img').naturalWidth`), 0);
  assert.equal(await failedArt.evaluate(`!!document.querySelector('.scroll-art-disclosure')`), false);
  await failedArt.evaluate(`[...document.querySelectorAll('g.scroll-label')].find(item=>item.getAttribute('aria-label')?.startsWith('北京市，')).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await failedArt.wait(`new URLSearchParams(location.search).get('province')==='北京市'`, 'map works without artwork');
  results.push({ name:'artwork-failure', mapInteractive:true, disclosureHidden:true });
} finally { await failedArt.close(); }

const slow = await createHeadlessPage();
try {
  await slow.send('Network.setCacheDisabled', { cacheDisabled: true });
  await slow.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
  await slow.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
  await slow.send('Emulation.setCPUThrottlingRate', { rate:6 });
  await slow.send('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-motion', value:'reduce' }] });
  await slow.send('Network.emulateNetworkConditions', { offline:false, latency:400, downloadThroughput:100*1024, uploadThroughput:50*1024, connectionType:'cellular3g' });
  const started = Date.now();
  const checkpoints = await openHome(slow);
  const timings = await slow.evaluate(`(() => {
    const nav=performance.getEntriesByType('navigation')[0];
    const art=performance.getEntriesByType('resource').filter(item=>item.name.includes('shanhe-handscroll'));
    return {domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd),loadMs:Math.round(nav.loadEventEnd),artResources:art.map(item=>({name:item.name.split('/').at(-1),responseEndMs:Math.round(item.responseEnd),transferBytes:item.transferSize})),artCurrentSrc:document.querySelector('.scroll-painted-backdrop img')?.currentSrc??'',artNaturalWidth:document.querySelector('.scroll-painted-backdrop img')?.naturalWidth??0,provinceCount:document.querySelectorAll('g.scroll-province').length,storyVisible:!!document.querySelector('.atlas-story-beacon'),introMode:document.querySelector('[data-ink-intro]')?.dataset.introMode??'exited'};
  })()`);
  assert.equal(timings.provinceCount, 34);
  assert.ok(timings.artNaturalWidth > 0);
  assert.equal(timings.storyVisible, true);
  results.push({ name:'simulated-low-end-6x-cpu-100KiBs-400ms-rtt', elapsedWallMs:Date.now()-started, checkpoints, timings });
} finally { await slow.close(); }

await writeFile(new URL('results.json', output), JSON.stringify({ base, testedAt:new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify({ base, results }, null, 2));
