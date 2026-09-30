import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const output = new URL('../docs/audits/story-browser/local/', import.meta.url);
const batch = JSON.parse(await readFile(new URL('../src/data/stories-batch8.json', import.meta.url), 'utf8'));
await mkdir(output, { recursive: true });
const page = await createHeadlessPage();
const checks = [];
try {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    console.log(`device ${device}`);
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
    for (const story of batch.stories) {
      console.log(`story ${device} ${story.id}`);
      const url = new URL(base);
      url.searchParams.set('guide', '1');
      url.searchParams.set('story', story.id);
      await page.navigate(url.href);
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId===${JSON.stringify(story.id)}`, `${story.id} visible`);
      await page.wait(`document.querySelectorAll('.story-chapters > section').length===4`, `${story.id} chapters`);
      assert.equal(await page.evaluate(`document.querySelectorAll('.story-details li').length`), 3);
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if (button?.getAttribute('aria-expanded') !== 'true') button?.click(); })()`);
      console.log('sources open');
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`, `${story.id} source list`);
      const sourceUrls = await page.evaluate(`[...document.querySelectorAll('#story-source-list a[href]')].map(a=>({url:a.href,target:a.target,rel:a.rel}))`);
      for (const sourceId of story.summaryRefs) {
        const source = batch.sources.find(item => item.id === sourceId);
        assert.ok(source && sourceUrls.some(link => link.url === source.url && link.target === '_blank' && link.rel.includes('noreferrer')), `${story.id}: ${sourceId}`);
      }
      assert.equal(await page.evaluate(`document.documentElement.scrollWidth-innerWidth <= 1`), true, `${device}: ${story.id} overflow`);
      checks.push(`${device}: ${story.id} 直达、四章三细节、逐件延伸资料和无横向溢出`);
      if (story.id === 'hub-qj' && !mobile || story.id === 'sxd-dlr' && mobile) {
        await sleep(250);
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(new URL(`${device}-batch8-${story.id}.png`, output), Buffer.from(shot.data, 'base64'));
      }
      for (const relation of story.related) {
        console.log(`related ${relation.id}`);
        const reason = await page.evaluate(`document.querySelector('[data-related=${JSON.stringify(relation.id)}] p')?.textContent`);
        assert.equal(reason, relation.reason, `${story.id}: visible comparison reason`);
        await page.evaluate(`document.querySelector('[data-related=${JSON.stringify(relation.id)}]')?.click()`);
        await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId===${JSON.stringify(relation.id)}`, `${story.id} related jump`);
        await page.evaluate('history.back()');
        await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId===${JSON.stringify(story.id)}`, `${story.id} history restore`);
        checks.push(`${device}: ${story.id}→${relation.id} 有理由跳转并可历史返回`);
      }
    }
  }
  assert.deepEqual(page.errors, [], 'uncaught browser errors');
  assert.deepEqual(page.failures.filter(error => !/ERR_ABORTED/.test(error)), [], 'unexpected resource failures');
  await writeFile(new URL('batch8.json', output), `${JSON.stringify({ baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await page.close();
}
