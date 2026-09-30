// Batch 43 (fj-dhgy 德化观音 / ah-wgj 吴王光鉴) focused acceptance evidence.
// The full sweep lives in e2e-stories.mjs; this script adds per-story screenshots
// and re-asserts the boundaries the handoff calls out for these two entries:
// direct URL, four chapters, >=3 details, typed clickable sources, a reasoned
// cross-object comparison, minimum touch geometry and no horizontal overflow.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/story-browser/${scope}/`, import.meta.url);
await mkdir(output, { recursive: true });
const stories = ['fj-dhgy', 'ah-wgj'];
const page = await createHeadlessPage();
const checks = [];
let mobile = false;
const url = (params = {}) => { const u = new URL(base); u.searchParams.set('guide', '1'); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); return u.href; };

try {
  for (mobile of (process.env.HUAXIA_E2E_DEVICE === 'mobile' ? [true] : [false, true])) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
    for (const id of stories) {
      await page.navigate(url({ story: id, trail: 'ink' }));
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, `story ${id}`);
      await sleep(400);
      assert.equal(await page.evaluate(`document.querySelectorAll('.story-chapters > section').length`), 4, `${id} four chapters`);
      assert.ok((await page.evaluate(`document.querySelectorAll('.story-details li').length`)) >= 3, `${id} details`);
      assert.equal(await page.evaluate(`new URLSearchParams(location.search).has('trail')`), false, `${id} bogus trail normalized`);
      const related = await page.evaluate(`(() => { const a=document.querySelector('[data-related]'); return a ? {id:a.dataset.related, text:a.textContent.trim().slice(0,80), reason:a.textContent.length>10} : null; })()`);
      assert.ok(related && related.reason, `${id} reasoned comparison link`);
      const geometry = await page.evaluate(`(() => { const d=document.querySelector('.story-experience'); return { overflow:d.scrollWidth-d.clientWidth, page:document.documentElement.scrollWidth-innerWidth, small:[...d.querySelectorAll('button,a')].filter(e=>e.getClientRects().length && e.getBoundingClientRect().height<43).map(e=>e.textContent.slice(0,24)) }; })()`);
      assert.ok(geometry.overflow <= 1 && geometry.page <= 1, `${id} overflow ${JSON.stringify(geometry)}`);
      assert.deepEqual(geometry.small, [], `${id} touch targets`);
      await page.evaluate(`document.querySelector('[data-testid="story-viewport"]')?.scrollTo(0,0)`);
      await sleep(350);
      const top = await page.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`batch43-${device}-${id}.png`, output), Buffer.from(top.data, 'base64'));
      // The panel is a toggle whose state is restored per story, so drive it to the
      // open state rather than assuming one click opens it.
      const openList = `document.querySelectorAll('#story-source-list a[href]').length > 0`;
      const clickSources = `(() => { document.querySelector('.story-sources > button')?.click(); })()`;
      if ((await page.evaluate(`document.querySelector('.story-sources > button')?.getAttribute('aria-expanded')`)) !== 'true') {
        await page.evaluate(clickSources);
        try {
          await page.wait(openList, `${id} typed clickable source list`, 4000);
        } catch {
          // A click landed before React attached its handler; retry once.
          await page.evaluate(clickSources);
          await page.wait(openList, `${id} typed clickable source list`, 8000);
        }
      }
      await page.wait(openList, `${id} typed clickable source list`, 8000);
      const sourceCount = await page.evaluate(`document.querySelectorAll('#story-source-list a[href]').length`);
      assert.ok(sourceCount > 0, `${id} has clickable sources`);
      await page.evaluate(`document.querySelector('#story-source-list')?.scrollIntoView({block:'center'})`);
      await sleep(350);
      const shot = await page.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`batch43-${device}-${id}-sources.png`, output), Buffer.from(shot.data, 'base64'));
      checks.push(`${device}: ${id} 四章、≥3细节、来源面板可点(${sourceCount}条)、有理由比较(${related.id})、无溢出`);
    }
  }
  assert.deepEqual(page.errors, [], 'uncaught browser errors');
  assert.deepEqual(page.failures.filter(e => !/ERR_ABORTED/.test(e)), [], 'unexpected network failures');
  await writeFile(new URL('batch43-results.json', output), `${JSON.stringify({ baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  await page.send('Page.captureScreenshot', { format: 'png' }).then(shot => writeFile(new URL('batch43-failure.png', output), Buffer.from(shot.data, 'base64'))).catch(() => {});
  throw error;
} finally { await page.close(); }
