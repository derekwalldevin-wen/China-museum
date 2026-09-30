import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4174/';
const manifest = JSON.parse(await readFile(new URL('../assets/artifact-image-prompts/nanyue-five-2026-09-27.json', import.meta.url), 'utf8'));
const page = await createHeadlessPage();
const checks = [];
try {
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width:mobile ? 390 : 1440, height:mobile ? 844 : 960, deviceScaleFactor:mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled:mobile, maxTouchPoints:5 });
    for (const item of manifest.items) {
      const target = new URL(base);
      target.searchParams.set('province', '广东省');
      target.searchParams.set('museum', 'nanyue');
      target.searchParams.set('artifact', item.id);
      await page.navigate(target.href);
      await page.wait(`document.querySelector('[role="dialog"]')?.textContent.includes('AI 复原示意 · 非文物实拍')`, `${device}:${item.id}:disclosure`);
      await page.wait(`document.querySelector('[role="dialog"] img[data-original-src=${JSON.stringify(item.output)}]')?.naturalWidth > 0`, `${device}:${item.id}:image`, 30000);
      const detail = await page.evaluate(`(() => { const d=document.querySelector('[role="dialog"]'); const image=d.querySelector('img[data-original-src=${JSON.stringify(item.output)}]'); const link=[...d.querySelectorAll('a')].find(a=>a.textContent.includes('查看馆藏资料')); const entry=d.querySelector('[data-story-entry]'); return {text:d.textContent, imageKind:image?.getAttribute('data-original-src'), imageUrl:image?.currentSrc, link:link?.href, linkHeight:link?.getBoundingClientRect().height, entryHeight:entry?.getBoundingClientRect().height, overflow:document.documentElement.scrollWidth-innerWidth}; })()`);
      assert.equal(detail.imageKind, item.output);
      assert.match(detail.imageUrl, /artifact-responsive\/.*\.webp/);
      assert.equal(detail.link, item.authorityUrl);
      assert.match(detail.text, /非图片授权/);
      assert.doesNotMatch(detail.text, /来源图 · 非 AI 复原/);
      assert.ok(detail.overflow <= 1, `${device}:${item.id}:overflow ${detail.overflow}`);
      if (mobile) assert.ok(detail.linkHeight >= 44 && detail.entryHeight >= 44, `${item.id}:touch target`);
      await page.evaluate(`document.querySelector('[role="dialog"] [data-story-entry]').click()`);
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === ${JSON.stringify(item.id)}`, `${device}:${item.id}:story`);
      assert.equal(await page.evaluate(`document.querySelectorAll('.story-chapters > section').length`), 4);
      checks.push(`${device}: ${item.id} AI披露、WebP、馆方文字链接、故事入口`);
    }
  }
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.failures, []);
  console.log(JSON.stringify({ passed:checks.length, checks }, null, 2));
} finally {
  await page.close();
}
