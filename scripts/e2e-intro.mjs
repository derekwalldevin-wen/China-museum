import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const output = new URL('../docs/audits/ink-intro-browser/local/', import.meta.url);
await mkdir(output, { recursive: true });
const checks = [];

async function shot(page, name) {
  const image = await page.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(name, output), Buffer.from(image.data, 'base64'));
}

async function withPage({ width, height, mobile = false, script }, run) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
    if (script) {
      const injection = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: script });
      page.testScriptId = injection.identifier;
    }
    await run(page);
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  } finally {
    await page.close();
  }
}

const forceDynamic = `window.__HUAXIA_INTRO_TEST__={forceDynamic:true,holdStatic:true,ignoreDeadline:true,timeMs:0};`;
await withPage({ width: 1440, height: 960, script: forceDynamic }, async page => {
  await page.navigate(base);
  await page.wait(`!!document.querySelector('[data-ink-intro]')`, 'desktop intro shell');
  await sleep(800);
  const desktopPreparation = await page.evaluate(`({mode:document.querySelector('[data-ink-intro]')?.dataset.introMode,resources:performance.getEntriesByType('resource').map(entry=>entry.name).filter(name=>/InkScrollIntro/.test(name)),marks:performance.getEntriesByType('mark').map(entry=>entry.name)})`);
  if (desktopPreparation.mode !== 'dynamic') console.error(JSON.stringify(desktopPreparation, null, 2));
  await page.wait(`Boolean(document.querySelector('[data-intro-motion]')) && document.querySelector('[data-ink-intro]')?.dataset.introMode === 'dynamic'`, 'desktop web motion intro');
  await page.wait(`document.querySelectorAll('[data-webgl-intro="particles"]').length===1`, 'desktop Three.js particles');
  await page.wait(`document.querySelector('.ink-intro-paint img')?.complete === true`, 'desktop intro art request', 10000);
  const artState = await page.evaluate(`({loaded:document.querySelector('.ink-intro-paint img')?.naturalWidth ?? 0,src:document.querySelector('.ink-intro-paint img')?.currentSrc})`);
  assert.ok(artState.loaded > 0, JSON.stringify(artState));
  const stages = [
    [0, 'paper'],
    [720, 'ink'],
    [1420, 'artifact'],
    [1940, 'seal'],
    [2420, 'reveal'],
  ];
  for (const [timeMs, phase] of stages) {
    await page.evaluate(`window.__HUAXIA_INTRO_TEST__.timeMs=${timeMs};window.dispatchEvent(new Event('huaxia:intro-test-time'))`);
    await page.wait(`document.querySelector('[data-ink-intro]')?.dataset.introPhase === ${JSON.stringify(phase)}`, `desktop ${phase}`);
    await sleep(80);
    await shot(page, `desktop-${String(timeMs).padStart(4, '0')}-${phase}.png`);
  }
  const resources = await page.evaluate(`performance.getEntriesByType('resource').map(entry=>entry.name).filter(name=>/InkScrollIntro/.test(name))`);
  assert.equal(resources.length, 1);
  const before = await page.evaluate('performance.now()');
  await page.evaluate(`document.querySelector('.ink-intro-skip').click()`);
  await page.wait(`!document.querySelector('[data-ink-intro]')`, 'skip removes intro');
  const exitMs = await page.evaluate(`performance.now()-${before}`);
  assert.ok(exitMs < 200, `skip took ${exitMs}ms`);
  assert.equal(await page.evaluate(`document.querySelectorAll('[data-intro-motion]').length`), 0);
  assert.equal(await page.evaluate(`document.querySelectorAll('[data-webgl-intro]').length`), 0);
  assert.equal(await page.evaluate(`document.querySelector('#root > div > div')?.hasAttribute('inert')`), false);
  checks.push(`desktop: 5 frozen storyboard frames; skip exited and released motion DOM in ${exitMs.toFixed(1)}ms`);

  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: page.testScriptId });
  await page.send('Page.reload', { ignoreCache: true });
  await page.wait(`document.readyState==='complete' && document.querySelectorAll('g.scroll-province').length===34`, 'reload map');
  assert.equal(await page.evaluate(`!!document.querySelector('[data-ink-intro]')`), false);
  checks.push('session: reload bypasses the opening and restores the map directly');
});

await withPage({ width: 390, height: 844, mobile: true, script: forceDynamic }, async page => {
  await page.navigate(base);
  await page.wait(`Boolean(document.querySelector('[data-intro-motion]'))`, 'mobile web motion intro');
  for (const [timeMs, phase] of [[0, 'paper'], [1420, 'artifact'], [1940, 'seal'], [2420, 'reveal']]) {
    await page.evaluate(`window.__HUAXIA_INTRO_TEST__.timeMs=${timeMs};window.dispatchEvent(new Event('huaxia:intro-test-time'))`);
    await page.wait(`document.querySelector('[data-ink-intro]')?.dataset.introPhase === ${JSON.stringify(phase)}`, `mobile ${phase}`);
    await sleep(80);
    await shot(page, `mobile-${String(timeMs).padStart(4, '0')}-${phase}.png`);
  }
  const layout = await page.evaluate(`({overflow:document.documentElement.scrollWidth-innerWidth,skip:document.querySelector('.ink-intro-skip').getBoundingClientRect().height,canvas:document.querySelectorAll('[data-webgl-intro="particles"]').length,particles:Number(document.querySelector('[data-webgl-intro="particles"]')?.dataset.particleCount)})`);
  assert.equal(layout.overflow, 0);
  assert.ok(layout.skip >= 44);
  assert.equal(layout.canvas, 1);
  assert.ok(layout.particles <= 320);
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 342, y: 40 }] });
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.wait(`!document.querySelector('[data-ink-intro]')`, 'mobile touch skip');
  checks.push('mobile: 4 storyboard frames, 44px skip target, one bounded Three.js canvas and no horizontal overflow');
});

await withPage({
  width: 390,
  height: 844,
  mobile: true,
  script: `window.__HUAXIA_INTRO_TEST__={forceStatic:true,holdStatic:true};`,
}, async page => {
  await page.navigate(base);
  await page.wait(`document.querySelector('[data-ink-intro]')?.dataset.introMode === 'static'`, 'static replacement');
  await shot(page, 'mobile-static-replacement.png');
  const state = await page.evaluate(`({canvas:document.querySelectorAll('canvas').length,dynamicRequests:performance.getEntriesByType('resource').filter(entry=>/InkScrollIntro/.test(entry.name)).length})`);
  assert.deepEqual(state, { canvas: 0, dynamicRequests: 0 });
  checks.push('constrained replacement: static paper renders without the motion chunk or canvas');
});

await withPage({ width: 390, height: 844, mobile: true }, async page => {
  const gallery = new URL('?province=北京市&museum=gugong', base).href;
  await page.navigate(gallery);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length===2`, 'gallery two cards', 30000);
  await sleep(500);
  const result = await page.evaluate(`({intro:!!document.querySelector('[data-ink-intro]'),cards:performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname.includes('/artifact-responsive/')&&entry.name.includes('-card-w')&&entry.name.endsWith('.webp')).length})`);
  assert.deepEqual(result, { intro: false, cards: 2 });
  checks.push('business boundary: direct 390px gallery route bypasses opening and still requests exactly 2 card images');
});

const result = { baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks };
await writeFile(new URL('results.json', output), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
