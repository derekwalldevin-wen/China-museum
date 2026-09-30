import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const output = new URL('../docs/audits/story-browser/local/', import.meta.url);
await mkdir(output, { recursive:true });
const page = await createHeadlessPage();
const ids = ['gb-hmwd','gb-syz','sh-dkd','sx-nz'];
const checks = [];
const direct = id => {
  const url = new URL(base);
  for (const [key,value] of Object.entries({province:'北京市',museum:'guobo',era:'先秦',category:'青铜器',story:id,guide:'1'})) url.searchParams.set(key,value);
  return url.href;
};
const waitStory = id => page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, id, 30000);
try {
  for (const mobile of [false,true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:960,deviceScaleFactor:mobile?2:1,mobile});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
    for (const id of ids) {
      await page.navigate(direct(id)); await waitStory(id); await sleep(250);
      const result = await page.evaluate(`(() => ({id:document.querySelector('[data-story-id]')?.dataset.storyId,chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,overflow:document.documentElement.scrollWidth-innerWidth,sourceButton:!!document.querySelector('.story-sources > button'),search:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(result.id,id); assert.equal(result.chapters,4); assert.equal(result.details,3);
      assert.ok(result.overflow<=1,JSON.stringify(result)); assert.equal(result.sourceButton,true);
      assert.equal(result.search.province,'北京市'); assert.equal(result.search.museum,'guobo');
      assert.equal(result.search.era,'先秦'); assert.equal(result.search.category,'青铜器');
      checks.push(`${device}: ${id} direct URL, content, filters, geometry`);
    }
    await page.navigate(direct('gb-hmwd')); await waitStory('gb-hmwd');
    await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop=440`);
    const before = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    await page.evaluate(`document.querySelector('[data-related="gb-syz"]')?.click()`); await waitStory('gb-syz');
    assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('province')`),'北京市');
    await page.evaluate('history.back()'); await waitStory('gb-hmwd'); await sleep(350);
    const after = await page.evaluate(`document.querySelector('[data-testid="story-viewport"]').scrollTop`);
    assert.ok(Math.abs(after-before)<55,`scroll restore ${device}: ${before} -> ${after}`);
    checks.push(`${device}: related jump, filter retention, browser back and reading restoration`);
    const shot = await page.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(`${device}-bronze-batch4.png`,output),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(page.errors,[]); assert.deepEqual(page.failures,[]);
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { await page.close(); }
