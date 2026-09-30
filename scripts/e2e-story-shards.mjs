import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const shardCount = Number(process.env.HUAXIA_STORY_SHARD_COUNT ?? 6);
const shardIndex = Number(process.env.HUAXIA_STORY_SHARD_INDEX ?? 0);
assert.ok(Number.isInteger(shardCount) && shardCount > 0);
assert.ok(Number.isInteger(shardIndex) && shardIndex >= 0 && shardIndex < shardCount);
const sourceDir = new URL('../src/data/', import.meta.url);
const sourceFiles = (await readdir(sourceDir)).filter(file => /^stories(?:-batch\d+)?\.json$/.test(file));
sourceFiles.sort((a, b) => {
  const index = file => file === 'stories.json' ? 1 : Number(file.match(/batch(\d+)/)?.[1]);
  return index(a) - index(b);
});
const byId = new Map();
for (const file of sourceFiles) {
  const data = JSON.parse(await readFile(new URL(file, sourceDir), 'utf8'));
  for (const story of data.stories) byId.set(story.id, story);
}
const allIds = [...byId.keys()].sort();
const ids = allIds.filter((_, index) => index % shardCount === shardIndex);
const output = new URL(`../docs/audits/story-browser/shards-${shardCount}/`, import.meta.url);
await mkdir(output, { recursive: true });
const resultUrl = new URL(`shard-${shardIndex}.json`, output);
const result = { base, shardCount, shardIndex, catalogSize: allIds.length, ids, startedAt: new Date().toISOString(), completed: false, checks: [], failures: [] };
const save = async () => writeFile(resultUrl, `${JSON.stringify(result, null, 2)}\n`);
await save();

for (const id of ids) {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    let page;
    try {
      page = await createHeadlessPage();
      await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
      const url = new URL(base);
      for (const [key, value] of Object.entries({ province: '湖北省', era: '宋辽金元', guide: '1', story: id })) url.searchParams.set(key, value);
      await page.navigate(url.href);
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(id)}`, `${id} story`, 30000);
      const state = await page.evaluate(`(() => ({story:document.querySelector('[data-story-id]')?.dataset.storyId,chapters:document.querySelectorAll('.story-chapters > section').length,details:document.querySelectorAll('.story-details li').length,related:document.querySelectorAll('[data-related]').length,overflow:document.documentElement.scrollWidth-innerWidth,params:Object.fromEntries(new URLSearchParams(location.search))}))()`);
      assert.equal(state.story, id);
      assert.equal(state.chapters, 4);
      assert.ok(state.details >= 3, `${id} details ${state.details}`);
      assert.ok(state.related >= 1);
      assert.ok(state.overflow <= 1, `horizontal overflow ${state.overflow}`);
      assert.equal(state.params.province, '湖北省');
      assert.equal(state.params.era, '宋辽金元');
      await page.evaluate(`(() => { const button=document.querySelector('.story-sources > button'); if (button?.getAttribute('aria-expanded') !== 'true') button?.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list a[href]')`, `${id} sources`);
      const source = await page.evaluate(`(() => { const link=document.querySelector('#story-source-list a[href]'); return {href:link.href,target:link.target,rel:link.rel}; })()`);
      assert.ok(source.href.startsWith('https://'));
      assert.equal(source.target, '_blank');
      assert.match(source.rel, /noreferrer/);
      assert.deepEqual(page.errors, []);
      assert.deepEqual(page.failures.filter(error => !/ERR_ABORTED/.test(error)), []);
      result.checks.push({ id, device, passed: true });
      console.log(`PASS ${device} ${id}`);
    } catch (error) {
      result.failures.push({ id, device, error: String(error?.stack ?? error) });
      console.error(`FAIL ${device} ${id}: ${error?.message ?? error}`);
    } finally {
      if (page) {
        try { await page.close(); } catch (error) { result.failures.push({ id, device, error: `close: ${String(error)}` }); }
      }
      await save();
    }
  }
}
result.completed = true;
result.finishedAt = new Date().toISOString();
await save();
assert.equal(result.failures.length, 0, `${result.failures.length} failed story-device checks`);
assert.equal(result.checks.length, ids.length * 2);
console.log(JSON.stringify({ shardIndex, shardCount, catalogSize: allIds.length, passed: result.checks.length, failed: result.failures.length }));
