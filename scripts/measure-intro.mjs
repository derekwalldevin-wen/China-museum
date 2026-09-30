import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const result = { baseUrl: base, measuredAt: new Date().toISOString() };

async function open(script, cacheDisabled) {
  const page = await createHeadlessPage();
  await page.send('Network.setCacheDisabled', { cacheDisabled });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: script });
  await page.navigate(base);
  return page;
}

const cold = await open(`window.__HUAXIA_INTRO_TEST__={forceDynamic:true,holdStatic:true,prepareDelayMs:650};`, true);
try {
  await cold.wait(`document.querySelector('[data-ink-intro]')?.dataset.introMode === 'static'`, 'prepare fallback', 8000);
  result.coldDeadline = await cold.evaluate(`(() => {
    const root=document.querySelector('[data-ink-intro]');
    const resource=performance.getEntriesByType('resource').find(entry=>/InkScrollIntro/.test(entry.name));
    const marks=Object.fromEntries(performance.getEntriesByType('mark').map(mark=>[mark.name,mark.startTime]));
    return {mode:root?.dataset.introMode ?? 'exited',deadlineMs:marks['huaxia:intro:prepare-timeout']-marks['huaxia:intro:dynamic:shown'],chunkDurationMs:resource?.duration ?? null,canvas:!!root?.querySelector('canvas')};
  })()`);
  assert.equal(result.coldDeadline.mode, 'static');
  assert.equal(result.coldDeadline.canvas, false);
  assert.ok(result.coldDeadline.deadlineMs >= 490, result.coldDeadline.deadlineMs);
  // Headless main-thread stalls may delay the callback; never mistake that for
  // permission to mount the dynamic layer after the deadline.
} finally { await cold.close(); }

const prewarm = await open(`window.__HUAXIA_INTRO_TEST__={forceDynamic:true,holdStatic:true,ignoreDeadline:true,timeMs:0};`, false);
try { await prewarm.wait(`!!document.querySelector('[data-intro-motion]')`, 'prewarm motion chunk'); }
finally { await prewarm.close(); }

const warm = await open(`window.__HUAXIA_INTRO_TEST__={forceDynamic:true};`, false);
try {
  await warm.wait(`performance.getEntriesByType('mark').some(mark=>mark.name==='huaxia:intro:motion-ready')`, 'warm motion ready');
  await warm.wait(`performance.getEntriesByType('mark').some(mark=>mark.name==='huaxia:intro:exit:complete')`, 'warm intro complete', 6000);
  result.warmDynamic = await warm.evaluate(`(() => {
    const marks=Object.fromEntries(performance.getEntriesByType('mark').map(mark=>[mark.name,mark.startTime]));
    const resource=performance.getEntriesByType('resource').find(entry=>/InkScrollIntro/.test(entry.name));
    return {
      shellShownMs:marks['huaxia:intro:dynamic:shown'],
      motionReadyMs:marks['huaxia:intro:motion-ready'],
      mapReadyMs:marks['huaxia:map:ready'],
      completeMs:marks['huaxia:intro:exit:complete'],
      chunkDurationMs:resource?.duration ?? null,
      remainingMotion:document.querySelectorAll('[data-intro-motion]').length,
    };
  })()`);
  const prepareElapsed = result.warmDynamic.motionReadyMs - result.warmDynamic.shellShownMs;
  assert.ok(prepareElapsed < 500, `motion prepared in ${prepareElapsed}ms`);
  assert.ok(result.warmDynamic.completeMs - result.warmDynamic.motionReadyMs <= 3300,
    `motion duration ${result.warmDynamic.completeMs - result.warmDynamic.motionReadyMs}ms`);
  assert.equal(result.warmDynamic.remainingMotion, 0);
} finally { await warm.close(); }

await writeFile(new URL('../docs/audits/ink-intro-performance.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
